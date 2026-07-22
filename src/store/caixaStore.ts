import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  CaixaSessao,
  MetodoPagamento,
  Movimentacao,
  MovimentacaoManual,
} from "@/types/caixa"
import { describePayment, type Payment } from "@/types/payment"

function gerarId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

// Traduz a forma de pagamento de uma venda (Payment, vinda da Frente de
// Caixa) para o MetodoPagamento usado nas movimentações do caixa. Cartão
// crédito e débito são distinguidos pelo `cardType` do pagamento.
function metodoFromPagamento(pagamento: Pick<Payment, "kind" | "cardType">): MetodoPagamento {
  if (pagamento.kind === "cartao") {
    return pagamento.cardType === "credito" ? "cartao_credito" : "cartao_debito"
  }
  return pagamento.kind
}

// Regra de negócio: valor esperado = valor de abertura + suprimentos + vendas
// em dinheiro − sangrias.
//
// A venda em dinheiro entra como uma Movimentacao do tipo "venda", registrada
// pela Frente de Caixa no momento do checkout (registrarVenda) — é assim que
// o valor esperado do caixa físico bate com o dinheiro que de fato deveria
// estar na gaveta ao longo do turno.
export function calcularValorEsperado(sessao: CaixaSessao): number {
  const entradas = sessao.movimentacoes
    .filter((m) => m.tipo === "suprimento" || m.tipo === "venda")
    .reduce((soma, m) => soma + m.valor, 0)
  const sangrias = sessao.movimentacoes
    .filter((m) => m.tipo === "sangria")
    .reduce((soma, m) => soma + m.valor, 0)
  return sessao.valorAbertura + entradas - sangrias
}

// Mesmo total de calcularValorEsperado, mas quebrado por forma de pagamento —
// usado na conferência do fechamento de caixa. Sangria e suprimento só afetam
// dinheiro físico na gaveta, então entram apenas no método "dinheiro"; cartão
// crédito, cartão débito e pix são a soma das vendas registradas em cada um.
export function calcularEsperadoPorMetodo(sessao: CaixaSessao): Record<MetodoPagamento, number> {
  const porMetodo: Record<MetodoPagamento, number> = {
    dinheiro: sessao.valorAbertura,
    cartao_credito: 0,
    cartao_debito: 0,
    pix: 0,
  }

  sessao.movimentacoes.forEach((m) => {
    if (m.tipo === "venda") {
      const metodo = m.metodo ?? "dinheiro"
      porMetodo[metodo] += m.valor
      return
    }
    if (m.tipo === "suprimento") {
      porMetodo.dinheiro += m.valor
      return
    }
    if (m.tipo === "sangria") {
      porMetodo.dinheiro -= m.valor
    }
  })

  return porMetodo
}

// Diferença entre o que foi contado fisicamente e o esperado.
// Positivo = sobra. Negativo = falta. Só faz sentido após o fechamento.
export function calcularDiferenca(sessao: CaixaSessao): number {
  if (sessao.valorContado === undefined) return 0
  return sessao.valorContado - calcularValorEsperado(sessao)
}

interface CaixaState {
  sessaoAtual: CaixaSessao | null
  historico: CaixaSessao[]
  abrirCaixa: (operador: string, valorAbertura: number) => void
  registrarMovimentacao: (
    tipo: MovimentacaoManual,
    valor: number,
    motivo: string,
    operador: string
  ) => void
  registrarVenda: (
    valor: number,
    pedidoNumero: number,
    operador: string,
    motivo?: string,
    pagamentos?: Payment[]
  ) => void
  fecharCaixa: (
    operador: string,
    valorContado: number,
    valorContadoPorMetodo?: Record<MetodoPagamento, number>
  ) => void
  getMovimentacoesDaSessao: (sessaoId: string) => Movimentacao[]
}

export const useCaixaStore = create<CaixaState>()(
  persist(
    (set, get) => ({
      sessaoAtual: null,
      historico: [],

      abrirCaixa: (operador, valorAbertura) => {
        // Guarda: só existe um caixa aberto por vez.
        if (get().sessaoAtual) return
        set({
          sessaoAtual: {
            id: gerarId(),
            status: "aberto",
            operadorAbertura: operador,
            valorAbertura,
            abertoEm: new Date().toISOString(),
            movimentacoes: [],
          },
        })
      },

      registrarMovimentacao: (tipo, valor, motivo, operador) => {
        const sessao = get().sessaoAtual
        if (!sessao) return
        const movimentacao: Movimentacao = {
          id: gerarId(),
          sessaoId: sessao.id,
          tipo,
          valor,
          motivo,
          operador,
          criadoEm: new Date().toISOString(),
        }
        set({
          sessaoAtual: {
            ...sessao,
            movimentacoes: [movimentacao, ...sessao.movimentacoes],
          },
        })
      },

      // Chamada pela Frente de Caixa a cada checkout. Se a venda tiver múltiplas
      // formas de pagamento, cada uma vira uma movimentação separada no caixa,
      // com seu próprio `metodo` (dinheiro/cartão crédito/cartão débito/pix)
      // para permitir a conferência por método no fechamento; o valor
      // registrado nunca ultrapassa o valor da venda, excluindo troco.
      registrarVenda: (valor, pedidoNumero, operador, motivo, pagamentos) => {
        const sessao = get().sessaoAtual
        if (!sessao || valor <= 0) return

        const fallbackMotivo = motivo && motivo.trim() ? motivo : "Venda"
        const pagamentosParaRegistrar =
          pagamentos && pagamentos.length > 0
            ? pagamentos.map((pagamento) => ({
                ...pagamento,
                amount: Math.max(0, pagamento.amount),
              }))
            : [{ kind: "dinheiro" as const, amount: valor }]

        let restante = valor
        const movimentacoes: Movimentacao[] = []

        pagamentosParaRegistrar.forEach((pagamento) => {
          if (restante <= 0) return
          const valorMovimentacao = Math.min(pagamento.amount, restante)
          if (valorMovimentacao <= 0) return
          restante -= valorMovimentacao

          movimentacoes.push({
            id: gerarId(),
            sessaoId: sessao.id,
            tipo: "venda",
            valor: valorMovimentacao,
            motivo: `Pedido Nº${pedidoNumero} · ${describePayment({
              kind: pagamento.kind,
              amount: valorMovimentacao,
              cardType: pagamento.cardType,
              installments: pagamento.installments,
            })}`,
            operador,
            criadoEm: new Date().toISOString(),
            pedidoNumero,
            metodo: metodoFromPagamento(pagamento),
          })
        })

        if (movimentacoes.length === 0) {
          movimentacoes.push({
            id: gerarId(),
            sessaoId: sessao.id,
            tipo: "venda",
            valor,
            motivo: fallbackMotivo,
            operador,
            criadoEm: new Date().toISOString(),
            pedidoNumero,
            metodo: "dinheiro",
          })
        }

        set({
          sessaoAtual: {
            ...sessao,
            movimentacoes: [...movimentacoes, ...sessao.movimentacoes],
          },
        })
      },

      fecharCaixa: (operador, valorContado, valorContadoPorMetodo) => {
        const sessao = get().sessaoAtual
        if (!sessao) return
        const fechado: CaixaSessao = {
          ...sessao,
          status: "fechado",
          operadorFechamento: operador,
          valorContado,
          valorContadoPorMetodo,
          fechadoEm: new Date().toISOString(),
        }
        set((state) => ({
          sessaoAtual: null,
          historico: [fechado, ...state.historico],
        }))
      },

      getMovimentacoesDaSessao: (sessaoId) => {
        const sessaoAtual = get().sessaoAtual
        const sessaoHistorica = get().historico.find((sessao) => sessao.id === sessaoId)

        if (sessaoAtual?.id === sessaoId) {
          return sessaoAtual.movimentacoes
        }

        if (sessaoHistorica) {
          return sessaoHistorica.movimentacoes
        }

        return []
      },
    }),
    { name: "flux-caixa" }
  )
)