import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { canAccessRoute, getDefaultRoute, isUserRole } from "@/lib/accessControl"

const PUBLIC_ROUTES = ["/login"]
const COOKIE_NAME = process.env.JWT_COOKIE_NAME ?? "flux_token"

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not defined")
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  if (isPublic) {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, getSecret())
        if (!isUserRole(payload.role)) throw new Error("Invalid role")
        return NextResponse.redirect(new URL(getDefaultRoute(payload.role), request.url))
      } catch {
        // invalid token on public route — just continue
      }
    }
    return NextResponse.next()
  }

  if (!token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!isUserRole(payload.role)) throw new Error("Invalid role")
    if (!canAccessRoute(payload.role, pathname)) {
      return NextResponse.redirect(new URL(getDefaultRoute(payload.role), request.url))
    }
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL(`/login?next=${pathname}`, request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
}
