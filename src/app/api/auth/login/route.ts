import { NextRequest, NextResponse } from "next/server"
import ky, { HTTPError } from "ky"

const COOKIE_NAME = process.env.JWT_COOKIE_NAME ?? "flux_token"
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? "flux_refresh_token"
const REFRESH_COOKIE_MAX_AGE = Number(process.env.REFRESH_COOKIE_MAX_AGE ?? 2592000)
const API_URL = process.env.API_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "http://localhost:3333"

export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    const data = await ky
      .post(`${API_URL}/api/v1/auth/login`, { json: body })
      .json<{
        accessToken: string
        refreshToken: string
        accessTokenExpiresIn: number
        user: object
      }>()

    const response = NextResponse.json({ user: data.user })
    response.cookies.set(COOKIE_NAME, data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: data.accessTokenExpiresIn,
      path: "/",
    })
    response.cookies.set(REFRESH_COOKIE_NAME, data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_COOKIE_MAX_AGE,
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
