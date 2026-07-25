import { create } from "zustand"
import { HTTPError } from "ky"
import { api, idempotencyHeaders } from "@/lib/api"
import type {
  CaixaSessao,
  MetodoPagamento,
  Movimentacao,
  MovimentacaoManual,
} from "@/types/caixa"

type ApiPaymentMethod = "cash" | "credit" | "debit" | "pix"

interface ApiCashSession {
  id: string
  openingOperator: { id: string; name: string }
  openedAt: string
  openingAmountCents: number
  status: "open" | "closed"
  closingOperator: { id: string; name: string } | null
  closedAt: string | null
  version: number
  expectedByMethod: Record<ApiPaymentMethod, number>
  closeCounts: Array<{
    paymentMethod: ApiPaymentMethod
    countedAmountCents: number
  }>
  movements: Array<{
    id: string
    type: "opening" | "sale" | "sale_reversal" | "return" | "supply" | "withdrawal" | "closing_adjustment"
    paymentMethod: ApiPaymentMethod
    amountCents: number
    reason: string
    actor: { id: string; name: string }
    occurredAt: string
    sourceType: string
    sourceId: string | null
  }>
}

interface MyRegister {
  session: ApiCashSession | null
}

const methodFromApi: Record<ApiPaymentMethod, MetodoPagamento> = {
  cash: "dinheiro",
  credit: "cartao_credito",
  debit: "cartao_debito",
  pix: "pix",
}

function movementType(type: ApiCashSession["movements"][number]["type"]): Movimentacao["tipo"] {
  if (type === "supply") return "suprimento"
  if (type === "withdrawal") return "sangria"
  if (type === "sale_reversal") return "estorno"
  if (type === "return") return "devolucao"
  if (type === "closing_adjustment") return "ajuste"
  return "venda"
}

function mapSession(session: ApiCashSession): CaixaSessao {
  const counted = session.closeCounts.length > 0
    ? session.closeCounts.reduce((total, count) => total + count.countedAmountCents, 0) / 100
    : undefined
  const countedByMethod = session.closeCounts.length > 0
    ? session.closeCounts.reduce((result, count) => {
        result[methodFromApi[count.paymentMethod]] = count.countedAmountCents / 100
        return result
      }, {
        dinheiro: 0,
        cartao_credito: 0,
        cartao_debito: 0,
        pix: 0,
      } as Record<MetodoPagamento, number>)
    : undefined

  return {
    id: session.id,
    status: session.status === "open" ? "aberto" : "fechado",
    operadorAbertura: session.openingOperator.name,
    valorAbertura: session.openingAmountCents / 100,
    abertoEm: session.openedAt,
    version: session.version,
    esperadoPorMetodo: {
      dinheiro: session.expectedByMethod.cash / 100,
      cartao_credito: session.expectedByMethod.credit / 100,
      cartao_debito: session.expectedByMethod.debit / 100,
      pix: session.expectedByMethod.pix / 100,
    },
    movimentacoes: session.movements
      .filter((movement) => movement.type !== "opening")
      .map((movement) => ({
        id: movement.id,
        sessaoId: session.id,
        tipo: movementType(movement.type),
        valor: movement.amountCents / 100,
        motivo: movement.reason,
        operador: movement.actor.name,
        criadoEm: movement.occurredAt,
        metodo: methodFromApi[movement.paymentMethod],
      })),
    ...(session.closingOperator ? { operadorFechamento: session.closingOperator.name } : {}),
    ...(counted !== undefined ? { valorContado: counted } : {}),
    ...(countedByMethod ? { valorContadoPorMetodo: countedByMethod } : {}),
    ...(session.closedAt ? { fechadoEm: session.closedAt } : {}),
  }
}

export function calcularEsperadoPorMetodo(sessao: CaixaSessao): Record<MetodoPagamento, number> {
  if (sessao.esperadoPorMetodo) return sessao.esperadoPorMetodo

  const porMetodo: Record<MetodoPagamento, number> = {
    dinheiro: sessao.valorAbertura,
    cartao_credito: 0,
    cartao_debito: 0,
    pix: 0,
  }
  sessao.movimentacoes.forEach((movimentacao) => {
    const metodo = movimentacao.metodo ?? "dinheiro"
    const sinal = movimentacao.tipo === "sangria"
      || movimentacao.tipo === "estorno"
      || movimentacao.tipo === "devolucao"
      ? -1
      : 1
    porMetodo[metodo] += sinal * movimentacao.valor
  })
  return porMetodo
}

export function calcularValorEsperado(sessao: CaixaSessao): number {
  return Object.values(calcularEsperadoPorMetodo(sessao)).reduce((total, value) => total + value, 0)
}

export function calcularDiferenca(sessao: CaixaSessao): number {
  if (sessao.valorContado === undefined) return 0
  return sessao.valorContado - calcularValorEsperado(sessao)
}

interface CaixaState {
  sessaoAtual: CaixaSessao | null
  historico: CaixaSessao[]
  loadCash: (includeHistory?: boolean) => Promise<void>
  abrirCaixa: (operador: string, valorAbertura: number) => Promise<void>
  registrarMovimentacao: (
    tipo: MovimentacaoManual,
    valor: number,
    motivo: string,
    operador: string
  ) => Promise<void>
  fecharCaixa: (
    operador: string,
    valorContado: number,
    valorContadoPorMetodo?: Record<MetodoPagamento, number>
  ) => Promise<void>
  getMovimentacoesDaSessao: (sessaoId: string) => Movimentacao[]
}

export const useCaixaStore = create<CaixaState>((set, get) => ({
  sessaoAtual: null,
  historico: [],
  loadCash: async (includeHistory = false) => {
    try {
      const current = await api.get("cash-registers/me").json<MyRegister>()
      set({ sessaoAtual: current.session ? mapSession(current.session) : null })
    } catch (error) {
      if (!(error instanceof HTTPError) || error.response.status !== 404) throw error
      set({ sessaoAtual: null })
    }

    if (!includeHistory) return
    try {
      const response = await api.get("cash-sessions", {
        searchParams: { pageSize: 100 },
      }).json<{ data: ApiCashSession[] }>()
      set({ historico: response.data.filter((session) => session.status === "closed").map(mapSession) })
    } catch (error) {
      if (!(error instanceof HTTPError) || error.response.status !== 403) throw error
      set({ historico: [] })
    }
  },
  abrirCaixa: async (_operador, valorAbertura) => {
    const session = await api.post("cash-registers/me/open", {
      headers: idempotencyHeaders(),
      json: { openingAmountCents: Math.round(valorAbertura * 100) },
    }).json<ApiCashSession>()
    set({ sessaoAtual: mapSession(session) })
  },
  registrarMovimentacao: async (tipo, valor, motivo) => {
    const operation = tipo === "suprimento" ? "supplies" : "withdrawals"
    const session = await api.post(`cash-registers/me/${operation}`, {
      headers: idempotencyHeaders(),
      json: {
        amountCents: Math.round(valor * 100),
        reason: motivo,
      },
    }).json<ApiCashSession>()
    set({ sessaoAtual: mapSession(session) })
  },
  fecharCaixa: async (_operador, _valorContado, valorContadoPorMetodo) => {
    const session = get().sessaoAtual
    if (!session || !valorContadoPorMetodo) return
    const closed = await api.post("cash-registers/me/close", {
      headers: idempotencyHeaders(),
      json: {
        version: session.version,
        countedByMethod: {
          cash: Math.round(valorContadoPorMetodo.dinheiro * 100),
          credit: Math.round(valorContadoPorMetodo.cartao_credito * 100),
          debit: Math.round(valorContadoPorMetodo.cartao_debito * 100),
          pix: Math.round(valorContadoPorMetodo.pix * 100),
        },
      },
    }).json<ApiCashSession>()
    set((state) => ({
      sessaoAtual: null,
      historico: [mapSession(closed), ...state.historico.filter((item) => item.id !== closed.id)],
    }))
  },
  getMovimentacoesDaSessao: (sessaoId) => {
    const current = get().sessaoAtual
    return current?.id === sessaoId
      ? current.movimentacoes
      : get().historico.find((session) => session.id === sessaoId)?.movimentacoes ?? []
  },
}))
