export interface JWTPayload {
  sub: string
  name: string
  email: string
  role: "admin" | "funcionario"
  iat: number
  exp: number
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: "admin" | "funcionario"
  avatar?: string
}

export interface LoginResponse {
  user: AuthUser
}
