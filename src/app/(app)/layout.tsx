import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AppLayout } from "@/components/layout/AppLayout"
import { UserHydrator } from "@/components/layout/UserHydrator"
import { SessionLockProvider } from "@/components/layout/SessionLockProvider"
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
      tenantId: payload.tenantId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      jobRole: payload.jobRole,
      permissions: payload.permissions,
    }
  } catch {
    redirect("/login")
  }
  const initiallyLocked = cookieStore.get("flux_session_lock")?.value === user.id

  return (
    <SessionLockProvider user={user} initiallyLocked={initiallyLocked}>
      <AppLayout>
        <UserHydrator user={user} />
        {children}
      </AppLayout>
    </SessionLockProvider>
  )
}
