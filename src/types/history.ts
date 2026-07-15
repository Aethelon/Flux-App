import type { Payment } from "./payment"

// O tipo fica no item, não na compra: o caixa permite carrinho misto
// (produto + serviço na mesma venda), então cada item carrega o seu tipo.
export interface HistoryItem {
  name: string
  quantity: number
  total: number
  type: "produto" | "servico"
}

export interface HistoryEntry {
  id: string
  orderNumber: number
  clientName: string
  phone: string
  date: string
  items: HistoryItem[]
  discount: number
  // Detalhamento completo do pagamento: uma ou mais formas, cada uma com seu
  // valor e, no cartão, tipo e parcelas. Mesmo modelo produzido pela Frente de Caixa.
  payments: Payment[]
}

// Corpo de uma venda finalizada na Frente de Caixa — o que futuramente será
// enviado ao backend (POST /vendas) e que origina o HistoryEntry correspondente.
export interface SaleInput {
  orderNumber: number
  clientName: string
  items: HistoryItem[]
  discount: number
  payments: Payment[]
}
