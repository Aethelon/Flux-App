export type OrderStatus = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado"

export interface Order {
  id: string
  title: string
  client: string
  status: OrderStatus
  priority: "baixa" | "média" | "alta"
  createdAt: string
  dueAt?: string
}
