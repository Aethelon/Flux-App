// Vocabulário único de pagamento, compartilhado entre a Frente de Caixa (onde o
// pagamento é montado) e o Histórico (onde ele fica registrado). Manter uma só
// definição garante coesão entre as duas telas.

export type PaymentKind = "dinheiro" | "cartao" | "pix"

export type CardType = "credito" | "debito"

export interface Payment {
  kind: PaymentKind
  amount: number
  cardType?: CardType // apenas quando kind === "cartao"
  installments?: number // apenas quando kind === "cartao" e cardType === "credito"
}

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  pix: "Pix",
}

// Descreve a forma de pagamento em texto — inclui tipo de cartão e parcelas.
// Ex.: "Cartão · Crédito 3x", "Cartão · Débito", "Pix".
export function describePayment(p: Payment): string {
  if (p.kind !== "cartao") return PAYMENT_KIND_LABEL[p.kind]
  if (p.cardType === "debito") return "Cartão · Débito"
  const n = p.installments ?? 1
  return n <= 1 ? "Cartão · Crédito à vista" : `Cartão · Crédito ${n}x`
}
