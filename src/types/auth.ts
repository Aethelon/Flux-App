export interface JWTPayload {
  sub: string
  tenantId: string
  sessionId: string
  name: string
  email: string
  role: "admin" | "funcionario"
  jobRole?: { id: string; name: string; systemKey: "administrator" | "operator" | null }
  permissions?: string[]
  iat: number
  exp: number
}

export interface AuthUser {
  id: string
  tenantId: string
  name: string
  email: string
  role: "admin" | "funcionario"
  jobRole?: { id: string; name: string; systemKey: "administrator" | "operator" | null }
  permissions?: string[]
  avatar?: string
}

export interface LoginResponse {
  user: AuthUser
}
