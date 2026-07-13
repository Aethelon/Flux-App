export type OrderPriority = "baixa" | "média" | "alta"

export interface KanbanColumn {
  id: string
  label: string
  color: string
}

export interface Order {
  id: string
  columnId: string
  title: string
  description: string
  client: string
  value: number
  priority: OrderPriority
  dueAt: string
}
