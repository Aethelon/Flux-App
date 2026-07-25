export type OrderPriority = "baixa" | "média" | "alta"

export interface KanbanColumn {
  id: string
  label: string
  color: string
  semanticType: "open" | "completed" | "cancelled"
  displayPosition: number
  protected: boolean
  version: number
}

export interface Order {
  id: string
  businessNumber: number
  columnId: string
  customerId: string
  title: string
  description: string
  client: string
  value: number
  priority: OrderPriority
  dueAt: string
  status: "open" | "completed" | "cancelled"
  version: number
  completedAt?: string // data em que entrou em "Concluído" (ISO)
}
