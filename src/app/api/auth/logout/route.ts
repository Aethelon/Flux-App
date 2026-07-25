import ky from "ky"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const COOKIE_NAME = process.env.JWT_COOKIE_NAME ?? "flux_token"
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? "flux_refresh_token"
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (token) {
    await ky.post(`${API_URL}/api/v1/auth/logout`, {
      headers: { authorization: `Bearer ${token}` },
      throwHttpErrors: false,
    })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" })
  response.cookies.set(REFRESH_COOKIE_NAME, "", { maxAge: 0, path: "/" })
  return response
}
