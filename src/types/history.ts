export interface HistoryItem {
  name: string
  quantity: number
  total: number
}

export type PaymentMethod = "Pix" | "Cartão de Crédito" | "Cartão de Débito" | "Dinheiro"

export interface HistoryEntry {
  id: string
  orderNumber: number
  clientName: string
  phone: string
  date: string
  type: "produto" | "servico"
  items: HistoryItem[]
  discount: number
  paymentMethod: PaymentMethod
}
