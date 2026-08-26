import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { canAccessRoute, getDefaultRoute, isUserRole } from "@/lib/accessControl"

const PUBLIC_ROUTES = ["/login"]
const COOKIE_NAME = process.env.JWT_COOKIE_NAME ?? "flux_token"
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

interface CurrentAccess {
  role: "admin" | "funcionario"
  permissions?: string[]
}

type CurrentAccessResult =
  | { status: "available"; access: CurrentAccess }
  | { status: "unauthorized" }
  | { status: "unavailable" }

const refreshRequests = new Map<string, Promise<AuthTokens | null>>()

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not defined")
  return new TextEncoder().encode(secret)
}

async function verifyAccessToken(token: string) {
  return jwtVerify(token, getSecret(), {
    issuer: "flux-api",
    audience: "flux-app",
    algorithms: ["HS256"],
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

async function currentAccess(accessToken: string): Promise<CurrentAccessResult> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      cache: "no-store",
    })
    if (response.status === 401) return { status: "unauthorized" }
    if (!response.ok) return { status: "unavailable" }
    const value = await response.json() as Partial<CurrentAccess>
    if (!isUserRole(value.role)) return { status: "unavailable" }
    return {
      status: "available",
      access: {
        role: value.role,
        ...(Array.isArray(value.permissions)
          ? { permissions: value.permissions.filter((permission): permission is string => typeof permission === "string") }
          : {}),
      },
    }
  } catch {
    return { status: "unavailable" }
  }
}

function setAuthCookies(response: NextResponse, tokens: AuthTokens) {
  response.cookies.set(COOKIE_NAME, tokens.accessToken, {
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
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(COOKIE_NAME)
  response.cookies.delete(REFRESH_COOKIE_NAME)
}

function nextWithTokens(request: NextRequest, tokens: AuthTokens) {
  const requestHeaders = new Headers(request.headers)
  const cookies = request.cookies.getAll()
    .filter(({ name }) => name !== COOKIE_NAME && name !== REFRESH_COOKIE_NAME)
  cookies.push(
    { name: COOKIE_NAME, value: tokens.accessToken },
    { name: REFRESH_COOKIE_NAME, value: tokens.refreshToken },
  )
  requestHeaders.set(
    "cookie",
    cookies.map(({ name, value }) => `${name}=${value}`).join("; "),
  )
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  setAuthCookies(response, tokens)
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value
  const isPublic = PUBLIC_ROUTES.includes(pathname)
  let payload

  if (token) {
    try {
      payload = (await verifyAccessToken(token)).payload
    } catch {
      // An expired access token can still be renewed by the refresh token.
    }
  }

  let tokens: AuthTokens | null = null
  if ((!payload || !isUserRole(payload.role)) && refreshToken) {
    tokens = await refresh(refreshToken)
    if (tokens) {
      try {
        payload = (await verifyAccessToken(tokens.accessToken)).payload
      } catch {
        tokens = null
      }
    }
  }

  if (!payload || !isUserRole(payload.role)) {
    if (isPublic) {
      const response = NextResponse.next()
      clearAuthCookies(response)
      return response
    }
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    const response = NextResponse.redirect(url)
    clearAuthCookies(response)
    return response
  }

  const liveAccess = await currentAccess(tokens?.accessToken ?? token ?? "")
  if (liveAccess.status === "unauthorized") {
    const response = isPublic
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url))
    clearAuthCookies(response)
    return response
  }
  const effectiveRole = liveAccess.status === "available" ? liveAccess.access.role : payload.role
  const permissions = liveAccess.status === "available"
    ? liveAccess.access.permissions
    : Array.isArray(payload.permissions)
      ? payload.permissions.filter((permission): permission is string => typeof permission === "string")
      : undefined

  if (isPublic || !canAccessRoute(effectiveRole, pathname, permissions)) {
    const response = NextResponse.redirect(new URL(getDefaultRoute(effectiveRole, permissions), request.url))
    if (tokens) setAuthCookies(response, tokens)
    return response
  }

  return tokens ? nextWithTokens(request, tokens) : NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/backend).*)"],
}
