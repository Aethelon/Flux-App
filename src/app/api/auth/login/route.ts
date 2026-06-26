import { NextRequest, NextResponse } from "next/server"
import ky, { HTTPError } from "ky"
import { SignJWT } from "jose"

const COOKIE_NAME = process.env.JWT_COOKIE_NAME ?? "flux_token"
const COOKIE_MAX_AGE = Number(process.env.JWT_COOKIE_MAX_AGE ?? 28800)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function getSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET is not defined")
  return new TextEncoder().encode(s)
}

async function mockLogin(email: string) {
  const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const payload = {
    sub: "dev-user-001",
    name,
    email,
    role: "admin" as const,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret())

  return { token, user: { id: payload.sub, name, email, role: payload.role } }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (process.env.MOCK_AUTH === "true") {
    const { token, user } = await mockLogin(body.email ?? "dev@flux.app")
    const response = NextResponse.json({ user })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })
    return response
  }

  try {
    const data = await ky
      .post(`${API_URL}/auth/login`, { json: body })
      .json<{ accessToken: string; user: object }>()

    const response = NextResponse.json({ user: data.user })
    response.cookies.set(COOKIE_NAME, data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })
    return response
  } catch (err) {
    if (err instanceof HTTPError) {
      const errorBody = await err.response.json().catch(() => ({}))
      return NextResponse.json(errorBody, { status: err.response.status })
    }
    return NextResponse.json({ message: "Algo deu errado." }, { status: 500 })
  }
}
