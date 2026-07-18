export type CaixaStatus = "aberto" | "fechado"

export type MovimentacaoTipo = "sangria" | "suprimento"

export interface Movimentacao {
  id: string
  tipo: MovimentacaoTipo
  valor: number
  motivo: string
  operador: string
  criadoEm: string // ISO
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
  fechadoEm?: string // ISO
}