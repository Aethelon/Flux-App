import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AppLayout } from "@/components/layout/AppLayout"
import { UserHydrator } from "@/components/layout/UserHydrator"
import { verifyToken, getTokenFromCookies } from "@/lib/auth.server"
import type { AuthUser } from "@/types/auth"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = getTokenFromCookies(cookieStore)

  if (!token) redirect("/login")

  let user: AuthUser
  try {
    const payload = await verifyToken(token)
    user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    }
  } catch {
    redirect("/login")
  }

  return (
    <AppLayout>
      <UserHydrator user={user} />
      {children}
    </AppLayout>
  )
}
