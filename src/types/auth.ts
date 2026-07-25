export interface JWTPayload {
  sub: string
  tenantId: string
  sessionId: string
  name: string
  email: string
  role: "admin" | "funcionario"
  iat: number
  exp: number
}

export interface AuthUser {
  id: string
  tenantId: string
  name: string
  email: string
  role: "admin" | "funcionario"
  avatar?: string
}

export interface LoginResponse {
  user: AuthUser
}
