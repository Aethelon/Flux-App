export interface Client {
  id: string
  name: string
  email: string
  phone: string
  status: "Ativo" | "Inativo"
  createdAt: string
}
