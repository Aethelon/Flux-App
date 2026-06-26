import ky from "ky"
import { cookies } from "next/headers"

export async function createApiClient() {
  const cookieStore = await cookies()
  const cookieName = process.env.JWT_COOKIE_NAME ?? "flux_token"
  const token = cookieStore.get(cookieName)?.value

  return ky.create({
    prefixUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}
