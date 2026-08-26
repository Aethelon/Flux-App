import type { AuthUser } from "@/types/auth"

export type UserRole = AuthUser["role"]

const ADMIN_ONLY_ROUTES = ["/funcionarios"]
const ROUTE_PERMISSIONS: Record<string, string> = {
  "/dashboard": "dashboard.view",
  "/frente-de-caixa": "pos.view",
  "/ordens": "orders.view",
  "/caixa": "cash.view",
  "/inteligencia": "intelligence.view",
  "/inventario": "inventory.view",
  "/historico": "history.view",
  "/clientes": "customers.view",
}

const DEFAULT_ROUTES = [
  "/dashboard",
  "/frente-de-caixa",
  "/ordens",
  "/caixa",
  "/inteligencia",
  "/inventario",
  "/historico",
  "/clientes",
]

export function isUserRole(role: unknown): role is UserRole {
  return role === "admin" || role === "funcionario"
}

export function hasPermission(role: UserRole | undefined, permissions: readonly string[] | undefined, permission: string): boolean {
  return role === "admin" || Boolean(permissions?.includes(permission))
}

export function canAccessRoute(role: UserRole, href: string, permissions?: readonly string[]): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false
  if (role === "admin") return true
  const pathname = href.split("?")[0]
  const required = Object.entries(ROUTE_PERMISSIONS).find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1]
  if (required) return hasPermission(role, permissions, required)
  return !ADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export function getDefaultRoute(role: UserRole, permissions?: readonly string[]): string {
  return DEFAULT_ROUTES.find((route) => canAccessRoute(role, route, permissions)) ?? "/sem-acesso"
}

export function canArchiveEmployee(currentUserId: string | undefined, employeeId: string): boolean {
  return Boolean(currentUserId) && currentUserId !== employeeId
}
