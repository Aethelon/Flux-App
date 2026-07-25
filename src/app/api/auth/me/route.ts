import ky, { HTTPError } from "ky"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getTokenFromCookies } from "@/lib/auth.server"

const API_URL = process.env.API_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "http://localhost:3333"

export async function GET() {
  const cookieStore = await cookies()
  const token = getTokenFromCookies(cookieStore)

  if (!token) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }

  try {
    const user = await ky.get(`${API_URL}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    }).json<object>()
    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof HTTPError) {
      const body = await error.response.json().catch(() => ({}))
      return NextResponse.json(body, { status: error.response.status })
    }
    return NextResponse.json({ message: "Algo deu errado." }, { status: 500 })
  }
}
