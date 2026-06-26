import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken, getTokenFromCookies } from "@/lib/auth.server"

export async function GET() {
  const cookieStore = await cookies()
  const token = getTokenFromCookies(cookieStore)

  if (!token) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }

  try {
    const payload = await verifyToken(token)
    return NextResponse.json({
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    })
  } catch {
    return NextResponse.json({ message: "Token inválido" }, { status: 401 })
  }
}
