import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CaixaSessao, Movimentacao, MovimentacaoTipo } from "@/types/caixa"

function gerarId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

// Regra de negócio: valor esperado = valor de abertura + suprimentos − sangrias.
//
// Não inclui vendas em dinheiro da Frente de Caixa de propósito: hoje o
// checkout do POS não persiste a venda em nenhum lugar consultável (fica só
// em memória local da tela) e o Histórico guarda a data como rótulo
// ("Hoje", "Ontem"), sem horário — não é possível atribuir uma venda a um
// turno de caixa específico com segurança. Quando o POS passar a gravar
// vendas com timestamp real, essa fórmula pode ser revisada para somar as
// vendas em dinheiro do período do turno.
export function calcularValorEsperado(sessao: CaixaSessao): number {
  const suprimentos = sessao.movimentacoes
    .filter((m) => m.tipo === "suprimento")
    .reduce((soma, m) => soma + m.valor, 0)
  const sangrias = sessao.movimentacoes
    .filter((m) => m.tipo === "sangria")
    .reduce((soma, m) => soma + m.valor, 0)
  return sessao.valorAbertura + suprimentos - sangrias
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
    tipo: MovimentacaoTipo,
    valor: number,
    motivo: string,
    operador: string
  ) => void
  fecharCaixa: (operador: string, valorContado: number) => void
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

      fecharCaixa: (operador, valorContado) => {
        const sessao = get().sessaoAtual
        if (!sessao) return
        const fechado: CaixaSessao = {
          ...sessao,
          status: "fechado",
          operadorFechamento: operador,
          valorContado,
          fechadoEm: new Date().toISOString(),
        }
        set((state) => ({
          sessaoAtual: null,
          historico: [fechado, ...state.historico],
        }))
      },
    }),
    { name: "flux-caixa" }
  )
)