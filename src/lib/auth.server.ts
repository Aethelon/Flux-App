import { jwtVerify } from "jose"
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"
import type { JWTPayload } from "@/types/auth"

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not defined")
  return new TextEncoder().encode(secret)
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as JWTPayload
}

export function getTokenFromCookies(
  cookies: ReadonlyRequestCookies
): string | undefined {
  const name = process.env.JWT_COOKIE_NAME ?? "flux_token"
  return cookies.get(name)?.value
}
