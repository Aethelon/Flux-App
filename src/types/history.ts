import type { Payment } from "./payment"

export interface HistoryItem {
  name: string
  quantity: number
  total: number
}

export interface HistoryEntry {
  id: string
  orderNumber: number
  clientName: string
  phone: string
  date: string
  type: "produto" | "servico"
  items: HistoryItem[]
  discount: number
  // Detalhamento completo do pagamento: uma ou mais formas, cada uma com seu
  // valor e, no cartão, tipo e parcelas. Mesmo modelo produzido pela Frente de Caixa.
  payments: Payment[]
}
