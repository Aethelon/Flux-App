import type { AuthUser } from "@/types/auth"

export type UserRole = AuthUser["role"]

const ADMIN_ONLY_ROUTES = ["/dashboard", "/inteligencia", "/caixa", "/funcionarios"]

export function isUserRole(role: unknown): role is UserRole {
  return role === "admin" || role === "funcionario"
}

export function canAccessRoute(role: UserRole, href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false
  if (role === "admin") return true
  const pathname = href.split("?")[0]
  return !ADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export function getDefaultRoute(role: UserRole): string {
  return role === "admin" ? "/dashboard" : "/frente-de-caixa"
}
