import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = process.env.JWT_COOKIE_NAME ?? "flux_token"
const API_URL = process.env.API_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "http://localhost:3333"

export async function POST(request: NextRequest) {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ message: "Sessão inválida ou expirada." }, { status: 401 })
  }

  const response = await fetch(`${API_URL}/api/v1/auth/verify-password`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  }).catch(() => null)

  if (!response) {
    return NextResponse.json({ message: "Não foi possível validar a senha." }, { status: 503 })
  }
  if (response.status === 204) return new NextResponse(null, { status: 204 })

  const body = await response.json().catch(() => ({ message: "Não foi possível validar a senha." }))
  return NextResponse.json(body, { status: response.status })
}
