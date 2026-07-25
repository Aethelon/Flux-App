import { randomUUID } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"

const ACCESS_COOKIE_NAME = process.env.JWT_COOKIE_NAME ?? "flux_token"
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? "flux_refresh_token"
const REFRESH_COOKIE_MAX_AGE = Number(process.env.REFRESH_COOKIE_MAX_AGE ?? 2592000)
const API_URL = process.env.API_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "http://localhost:3333"

interface AuthTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
}

const refreshRequests = new Map<string, Promise<AuthTokens | null>>()

function upstreamUrl(request: NextRequest, path: string[]): string {
  const url = new URL(`/api/v1/${path.map(encodeURIComponent).join("/")}`, API_URL)
  url.search = request.nextUrl.search
  return url.toString()
}

async function forward(
  request: NextRequest,
  path: string[],
  accessToken: string,
): Promise<Response> {
  const headers = new Headers()
  const contentType = request.headers.get("content-type")
  if (contentType) headers.set("content-type", contentType)
  headers.set("authorization", `Bearer ${accessToken}`)
  headers.set("x-request-id", request.headers.get("x-request-id") ?? randomUUID())
  const idempotencyKey = request.headers.get("idempotency-key")
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey)
  return fetch(upstreamUrl(request, path), {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer(),
    cache: "no-store",
  })
}

function refresh(refreshToken: string): Promise<AuthTokens | null> {
  const pending = refreshRequests.get(refreshToken)
  if (pending) return pending

  const request = fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  }).then(async (response) => {
    if (!response.ok) return null
    const tokens = await response.json() as Partial<AuthTokens>
    return typeof tokens.accessToken === "string"
      && typeof tokens.refreshToken === "string"
      && typeof tokens.accessTokenExpiresIn === "number"
      ? tokens as AuthTokens
      : null
  }).catch(() => null)

  refreshRequests.set(refreshToken, request)
  setTimeout(() => refreshRequests.delete(refreshToken), 5_000)
  return request
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value
  if (!accessToken) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  }
  let tokens: AuthTokens | null = null
  let upstream = await forward(request, path, accessToken)
  if (upstream.status === 401) {
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value
    tokens = refreshToken ? await refresh(refreshToken) : null
    if (tokens) upstream = await forward(request, path, tokens.accessToken)
  }
  const headers = new Headers()
  for (const name of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  })
  if (tokens) {
    response.cookies.set(ACCESS_COOKIE_NAME, tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: tokens.accessTokenExpiresIn,
      path: "/",
    })
    response.cookies.set(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: "/",
    })
  } else if (upstream.status === 401) {
    response.cookies.delete(ACCESS_COOKIE_NAME)
    response.cookies.delete(REFRESH_COOKIE_NAME)
  }
  return response
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const DELETE = proxy
