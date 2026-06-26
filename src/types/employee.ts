export interface Employee {
  id: string
  name: string
  email: string
  phone: string
  role: string
  status: "Ativo" | "Inativo"
  createdAt: string
}
