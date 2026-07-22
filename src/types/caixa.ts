export type CaixaStatus = "aberto" | "fechado"

// "venda" é gerada automaticamente pela Frente de Caixa para cada forma de
// pagamento — não passa pelo modal manual de movimentação, por isso
// fica separada de MovimentacaoManual (o que a Dialog de sangria/suprimento aceita).
export type MovimentacaoTipo = "sangria" | "suprimento" | "venda"
export type MovimentacaoManual = Exclude<MovimentacaoTipo, "venda">

// Forma de pagamento de uma movimentação de venda. Cartão crédito e débito
// ficam separados para permitir a conferência por método no fechamento do
// caixa — só existe (é preenchido) quando tipo === "venda".
export type MetodoPagamento = "dinheiro" | "cartao_credito" | "cartao_debito" | "pix"

export interface Movimentacao {
  id: string
  sessaoId?: string
  tipo: MovimentacaoTipo
  valor: number
  motivo: string
  operador: string
  criadoEm: string // ISO
  pedidoNumero?: number // apenas quando tipo === "venda" — referencia o pedido do POS
  metodo?: MetodoPagamento // apenas quando tipo === "venda" — forma de pagamento da parcela
}

export interface CaixaSessao {
  id: string
  status: CaixaStatus
  operadorAbertura: string
  valorAbertura: number
  abertoEm: string // ISO
  movimentacoes: Movimentacao[]
  operadorFechamento?: string
  valorContado?: number
  // Detalhamento do valor contado por forma de pagamento, informado no
  // fechamento do caixa — permite a conferência por método no histórico.
  // Sessões fechadas antes dessa mudança não têm esse campo (undefined).
  valorContadoPorMetodo?: Record<MetodoPagamento, number>
  fechadoEm?: string // ISO
}
