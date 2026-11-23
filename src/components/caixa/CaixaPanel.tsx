"use client"

import { useEffect, useEffectEvent, useState } from "react"
import {
  Lock,
  Unlock,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  Wallet,
  History,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatCurrency, formatMoneyInput, parsePriceInput } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { DataTable, type Column } from "@/components/shared/DataTable"
import {
  useCaixaStore,
  calcularValorEsperado,
  calcularEsperadoPorMetodo,
  calcularDiferenca,
} from "@/store/caixaStore"
import { useUserStore } from "@/store/userStore"
import type { CaixaSessao, MetodoPagamento, MovimentacaoTipo, MovimentacaoManual } from "@/types/caixa"
import { useLocale } from "@/components/layout/LocaleProvider"
import { cashMessages } from "./messages"

type CashMessages = (typeof cashMessages)[keyof typeof cashMessages]

function useCashMessages() {
  const { locale } = useLocale()
  return cashMessages[locale]
}

// Operador do turno = usuário logado (o mesmo que o layout hidrata do JWT).
function useOperadorLogado(): string {
  const user = useUserStore((s) => s.user)
  return user?.name ?? "Operador"
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-3 sm:p-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary)">
        {label}
      </span>
      <span
        className={cn(
          "wrap-anywhere text-[18px] font-semibold tracking-[-0.48px] sm:text-[24px]",
          tone === "danger" && "text-(--color-danger)",
          tone === "success" && "text-(--color-success)",
          !tone && "text-(--color-text-primary)"
        )}
      >
        {value}
      </span>
    </div>
  )
}

const TIPO_CONFIG: Record <
  MovimentacaoTipo | "abertura",
  { icon: typeof ArrowDownCircle; tone: "danger" | "success" | "accent" | "neutral" }
> = {
  abertura: { icon: Unlock, tone: "neutral" },
  sangria: { icon: ArrowDownCircle, tone: "danger" },
  suprimento: { icon: ArrowUpCircle, tone: "success" },
  venda: { icon: ShoppingCart, tone: "accent" },
  estorno: { icon: ArrowDownCircle, tone: "danger" },
  devolucao: { icon: ArrowDownCircle, tone: "danger" },
  ajuste: { icon: Wallet, tone: "neutral" },
}

function TipoBadge({ tipo }: { tipo: MovimentacaoTipo | "abertura" }) {
  const messages = useCashMessages()
  const { icon: Icon, tone } = TIPO_CONFIG[tipo]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
        tone === "danger" && "bg-(--color-danger)/10 text-(--color-danger)",
        tone === "success" && "bg-(--color-success)/10 text-(--color-success)",
        tone === "accent" && "bg-primary/10 text-(--color-accent)",
        tone === "neutral" && "bg-(--color-text-secondary)/10 text-(--color-text-secondary)"
      )}
    >
      <Icon size={12} />
      {messages[tipo]}
    </span>
  )
}

// Modal de abertura — pede só o fundo de troco inicial.
export function AbrirCaixaDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const messages = useCashMessages()
  const operador = useOperadorLogado()
  const abrirCaixa = useCaixaStore((s) => s.abrirCaixa)
  const [valor, setValor] = useState("0,00")
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm() {
    if (submitting) return
    const parsed = parsePriceInput(valor)
    if (parsed < 0) {
      toast.error(messages.invalidOpening)
      return
    }
    setSubmitting(true)
    try {
      await abrirCaixa(operador, parsed)
      toast.success(messages.opened(formatCurrency(parsed)))
      setValor("0,00")
      onOpenChange(false)
    } catch {
      toast.error(messages.openError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.openRegister}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Label htmlFor="valor-abertura">{messages.openingFloat}</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-(--color-text-secondary)">
              R$
            </span>
            <Input
              id="valor-abertura"
              inputMode="decimal"
              autoFocus
              value={valor}
              onChange={(e) => setValor(formatMoneyInput(e.target.value))}
              placeholder="0,00"
              className="pl-8"
            />
          </div>
          <span className="text-[12px] text-(--color-text-secondary)">
            {messages.operator}: {operador}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {messages.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? messages.opening : messages.openRegister}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Relatório exibido logo após o fechamento — mesmo formato usado no
// histórico (ConferenciaPorMetodoTable), reaproveitável em qualquer tela
// que feche o caixa (painel, header, frente de caixa).
export function ResumoFechamentoDialog({
  resumo,
  onOpenChange,
}: {
  resumo: ResumoFechamento | null
  onOpenChange: (open: boolean) => void
}) {
  const messages = useCashMessages()
  return (
    <Dialog open={!!resumo} onOpenChange={(open) => !open && onOpenChange(open)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{messages.closingSummary}</DialogTitle>
        </DialogHeader>
        {resumo && (
          <div className="flex min-w-0 flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-(--color-text-secondary)">
                {messages.byMethod}
              </span>
              <ConferenciaPorMetodoTable linhas={resumo.porMetodo} />
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-2 text-[13px]">
                <span className="text-(--color-text-secondary)">{messages.expectedTotal}</span>
                <span className="font-semibold text-(--color-text-primary)">
                  {formatCurrency(resumo.sistema)}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-2 text-[13px]">
                <span className="text-(--color-text-secondary)">{messages.reportedTotal}</span>
                <span className="font-semibold text-(--color-text-primary)">
                  {formatCurrency(resumo.informado)}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "rounded-xl border border-(--color-border) p-4 text-[13px] font-medium",
                Math.abs(resumo.diferenca) < 0.005
                  ? "border-(--color-success)/40 bg-(--color-success)/10 text-(--color-success)"
                  : "border-(--color-warning)/40 bg-(--color-warning)/10 text-(--color-warning)"
              )}
            >
              <div className="flex items-center justify-between">
                <span>{messages.totalDifference}</span>
                <span>{formatCurrency(Math.abs(resumo.diferenca))}</span>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{messages.close}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Modal reaproveitado para sangria e suprimento — só muda o rótulo/tipo.
function MovimentacaoDialog({
  tipo,
  open,
  onOpenChange,
}: {
  tipo: MovimentacaoManual
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const messages = useCashMessages()
  const operador = useOperadorLogado()
  const registrarMovimentacao = useCaixaStore((s) => s.registrarMovimentacao)
  const sessaoAtual = useCaixaStore((s) => s.sessaoAtual)
  const [valor, setValor] = useState("0,00")
  const [motivo, setMotivo] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const label = messages[tipo]

  async function handleConfirm() {
    if (submitting) return
    const parsed = parsePriceInput(valor)
    if (parsed <= 0) {
      toast.error(messages.positiveValue)
      return
    }
    const dinheiroDisponivel = sessaoAtual
      ? calcularEsperadoPorMetodo(sessaoAtual).dinheiro
      : 0
    if (tipo === "sangria" && parsed > dinheiroDisponivel + 0.005) {
      toast.error(messages.payoutLimit(formatCurrency(dinheiroDisponivel)))
      return
    }
    if (!motivo.trim()) {
      toast.error(messages.reasonRequired)
      return
    }
    setSubmitting(true)
    try {
      await registrarMovimentacao(tipo, parsed, motivo.trim(), operador)
      toast.success(messages.movementRecorded(label, formatCurrency(parsed)))
      setValor("0,00")
      setMotivo("")
      onOpenChange(false)
    } catch {
      toast.error(messages.recordError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="valor-mov">{messages.amount}</Label>
            <Input
              id="valor-mov"
              inputMode="decimal"
              autoFocus
              value={valor}
              onChange={(e) => setValor(formatMoneyInput(e.target.value))}
              placeholder="0,00"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-mov">{messages.reason}</Label>
            <Input
              id="motivo-mov"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={
                tipo === "sangria" ? messages.payoutExample : messages.depositExample
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {messages.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? messages.recording : messages.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const METODOS_FECHAMENTO: MetodoPagamento[] = ["dinheiro", "cartao_credito", "cartao_debito", "pix"]

// Chaves dos métodos de pagamento coletados no fechamento. Cartão crédito e
// débito ficam separados aqui — cada um é uma linha própria no modal e uma
// entrada independente no valor total contado.
type ValoresFechamento = Record<MetodoPagamento, string>

type LinhaConferencia = {
  metodo: MetodoPagamento
  esperado: number
  informado: number
  diferenca: number
}

export type ResumoFechamento = {
  sistema: number
  informado: number
  diferenca: number
  porMetodo: LinhaConferencia[]
}

// Tabela "esperado × informado × diferença" por forma de pagamento —
// reaproveitada tanto no resumo logo após o fechamento quanto na conferência
// de uma sessão já fechada, consultada pelo histórico.
function ConferenciaPorMetodoTable({ linhas }: { linhas: LinhaConferencia[] }) {
  const messages = useCashMessages()
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-[13px] whitespace-nowrap">
        <thead>
          <tr className="bg-(--color-surface-raised) text-(--color-text-secondary)">
            <th className="px-3 py-2 text-left font-medium">{messages.method}</th>
            <th className="px-3 py-2 text-right font-medium">{messages.expected}</th>
            <th className="px-3 py-2 text-right font-medium">{messages.reported}</th>
            <th className="px-3 py-2 text-right font-medium">{messages.difference}</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => {
            const confere = Math.abs(linha.diferenca) < 0.005
            return (
              <tr key={linha.metodo} className="border-t border-(--color-border)">
                <td className="px-3 py-2 text-(--color-text-primary)">
                  {messages[linha.metodo]}
                </td>
                <td className="px-3 py-2 text-right text-(--color-text-secondary)">
                  {formatCurrency(linha.esperado)}
                </td>
                <td className="px-3 py-2 text-right text-(--color-text-secondary)">
                  {formatCurrency(linha.informado)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-medium",
                    confere
                      ? "text-(--color-success)"
                      : linha.diferenca > 0
                        ? "text-(--color-accent)"
                        : "text-(--color-warning)"
                  )}
                >
                  {confere
                    ? "Confere"
                    : `${linha.diferenca > 0 ? "+" : "−"} ${formatCurrency(Math.abs(linha.diferenca))}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Monta as linhas de conferência (esperado × informado) de uma sessão a
// partir do seu detalhamento por método. Sessões fechadas antes de o
// detalhamento existir não têm `valorContadoPorMetodo` — nesse caso não é
// possível reconstruir o valor informado por método retroativamente.
function linhasConferenciaDaSessao(sessao: CaixaSessao): LinhaConferencia[] | null {
  if (!sessao.valorContadoPorMetodo) return null
  const esperadoPorMetodo = calcularEsperadoPorMetodo(sessao)
  return METODOS_FECHAMENTO.map((metodo) => {
    const esperado = esperadoPorMetodo[metodo]
    const informado = sessao.valorContadoPorMetodo?.[metodo] ?? 0
    return { metodo, esperado, informado, diferenca: informado - esperado }
  })
}

// Modal de fechamento — coleta os valores por método de pagamento.
export function FecharCaixaDialog({
  open,
  onOpenChange,
  onFechamentoConfirmado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFechamentoConfirmado?: (resumo: ResumoFechamento) => void
}) {
  const messages = useCashMessages()
  const operador = useOperadorLogado()
  const sessao = useCaixaStore((s) => s.sessaoAtual)
  const fecharCaixa = useCaixaStore((s) => s.fecharCaixa)
  const [valores, setValores] = useState<ValoresFechamento>({
    dinheiro: "0,00",
    cartao_credito: "0,00",
    cartao_debito: "0,00",
    pix: "0,00",
  })
  const [submitting, setSubmitting] = useState(false)

  if (!sessao) return null

  const sessaoAtual = sessao

  function handleChange(chave: keyof ValoresFechamento, valor: string) {
    setValores((prev) => ({ ...prev, [chave]: formatMoneyInput(valor) }))
  }

  async function handleConfirm() {
    if (submitting) return
    const valoresInformados = Object.values(valores)

    const totalContado = valoresInformados.reduce(
      (soma, valor) => soma + parsePriceInput(valor),
      0
    )

    const sistemaCalculado = calcularValorEsperado(sessaoAtual)
    const diferenca = totalContado - sistemaCalculado
    const esperadoPorMetodo = calcularEsperadoPorMetodo(sessaoAtual)
    const informadoPorMetodo = METODOS_FECHAMENTO.reduce(
      (acc, metodo) => ({ ...acc, [metodo]: parsePriceInput(valores[metodo]) }),
      {} as Record<MetodoPagamento, number>
    )
    const porMetodo: LinhaConferencia[] = METODOS_FECHAMENTO.map((metodo) => {
      const esperado = esperadoPorMetodo[metodo]
      const informado = informadoPorMetodo[metodo]
      return { metodo, esperado, informado, diferenca: informado - esperado }
    })

    setSubmitting(true)
    try {
      await fecharCaixa(operador, totalContado, informadoPorMetodo)
      onFechamentoConfirmado?.({
        sistema: sistemaCalculado,
        informado: totalContado,
        diferenca,
        porMetodo,
      })
      toast.success(messages.closedSuccess)
      setValores({ dinheiro: "0,00", cartao_credito: "0,00", cartao_debito: "0,00", pix: "0,00" })
      onOpenChange(false)
    } catch {
      toast.error(messages.closeError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{messages.closeRegister}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <p className="text-[13px] text-(--color-text-secondary)">
            {messages.closingInstructions}
          </p>

          <div className="flex flex-col gap-3">
            {METODOS_FECHAMENTO.map((metodo) => (
              <div
                key={metodo}
                className="flex items-center justify-between gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-3 sm:gap-3 sm:px-4"
              >
                <span className="text-[14px] font-medium text-(--color-text-primary)">
                  {messages[metodo]}
                </span>
                <div className="relative w-1/2 max-w-36 shrink-0 sm:w-36">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-(--color-text-secondary)">
                    R$
                  </span>
                  <Input
                    id={`valor-${metodo}`}
                    inputMode="decimal"
                    autoFocus={metodo === "dinheiro"}
                    value={valores[metodo]}
                    onChange={(e) => handleChange(metodo, e.target.value)}
                    placeholder="0,00"
                    className="pl-8"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {messages.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? messages.closing : messages.closeRegister}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface MovimentoTurnoRow {
  id: string
  tipo: MovimentacaoTipo | "abertura"
  motivo: string
  operador: string
  criadoEm: string
  valor: number
}

interface HistoricoCaixaRow {
  id: string
  periodo: string
  operador: string
  esperado: number
  contado: number
  diferenca: number
  status: "Confere" | "Sobra" | "Falta"
  sessao: CaixaSessao
}

function criarColunasMovimentacoes(messages: CashMessages): Column<MovimentoTurnoRow>[] {
  return [
    {
      key: "tipo",
      label: messages.movementType,
      render: (row) => <TipoBadge tipo={row.tipo} />,
    },
    {
      key: "motivo",
      label: messages.movementDescription,
      render: (row) => <span className="text-[14px] text-(--color-text-primary)">{row.motivo}</span>,
    },
    {
      key: "operador",
      label: messages.operator,
      render: (row) => <span className="text-[13px] text-(--color-text-secondary)">{row.operador}</span>,
    },
    {
      key: "criadoEm",
      label: messages.time,
      render: (row) => <span className="text-[13px] text-(--color-text-secondary)">{formatHora(row.criadoEm)}</span>,
    },
    {
      key: "valor",
      label: messages.amount,
      className: "text-right",
      render: (row) => (
        <span
          className={cn(
            "font-semibold",
            row.tipo === "sangria"
              ? "text-(--color-danger)"
              : row.tipo === "venda"
                ? "text-(--color-accent)"
                : row.tipo === "abertura"
                  ? "text-(--color-text-primary)"
                  : "text-(--color-success)"
          )}
        >
          {row.tipo === "sangria" ? "− " : "+ "}
          {formatCurrency(row.valor)}
        </span>
      ),
    },
  ]
}
function criarColunasHistorico(
  onVerConferencia: (sessao: CaixaSessao) => void,
  messages: CashMessages
): Column<HistoricoCaixaRow>[] {
  return [
    {
      key: "periodo",
      label: messages.shift,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-[14px] text-(--color-text-primary)">{row.periodo}</span>
          <span className="text-[11px] text-(--color-text-secondary)">{row.operador}</span>
        </div>
      ),
    },
    {
      key: "esperado",
      label: messages.expected,
      render: (row) => <span className="text-[13px] text-(--color-text-secondary)">{formatCurrency(row.esperado)}</span>,
    },
    {
      key: "contado",
      label: messages.counted,
      render: (row) => <span className="text-[13px] text-(--color-text-secondary)">{formatCurrency(row.contado)}</span>,
    },
    {
      key: "diferenca",
      label: messages.balance,
      render: (row) => (
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
            row.status === "Confere"
              ? "bg-(--color-success)/10 text-(--color-success)"
              : "bg-(--color-warning)/10 text-(--color-warning)"
          )}
        >
          {row.status === "Confere"
            ? messages.matches
            : `${row.status === "Sobra" ? messages.overage : messages.shortage} ${formatCurrency(Math.abs(row.diferenca))}`}
        </span>
      ),
    },
    {
      key: "conferencia",
      label: messages.reconciliation,
      className: "text-right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[12px]"
          onClick={() => onVerConferencia(row.sessao)}
        >
          {messages.viewByMethod}
        </Button>
      ),
    },
  ]
}

// Módulo de caixa (abertura, fechamento, sangria, suprimento, vendas por método
// e histórico de turnos fechados). É o conteúdo principal da
// tela /caixa; o Dashboard mostra só um resumo (CaixaResumoCard) com link pra cá.
export function CaixaPanel() {
  const messages = useCashMessages()
  const currentUser = useUserStore((s) => s.user)
  const isAdmin = currentUser?.role === "admin"
  const sessaoAtual = useCaixaStore((s) => s.sessaoAtual)
  const historico = useCaixaStore((s) => s.historico)
  const loadCash = useCaixaStore((s) => s.loadCash)
  const getMovimentacoesDaSessao = useCaixaStore((s) => s.getMovimentacoesDaSessao)

  const [abrirOpen, setAbrirOpen] = useState(false)
  const [movDialog, setMovDialog] = useState<MovimentacaoManual | null>(null)
  const [fecharOpen, setFecharOpen] = useState(false)
  const [resumoFechamento, setResumoFechamento] = useState<ResumoFechamento | null>(null)
  const [sessaoConferencia, setSessaoConferencia] = useState<CaixaSessao | null>(null)

  const showLoadError = useEffectEvent(() => toast.error(messages.loadError))

  useEffect(() => {
    void loadCash(isAdmin).catch(() => showLoadError())
  }, [isAdmin, loadCash])

  const colunasHistorico = criarColunasHistorico(setSessaoConferencia, messages)

  const movimentosDaSessao = sessaoAtual ? getMovimentacoesDaSessao(sessaoAtual.id) : []
  const esperado = sessaoAtual ? calcularValorEsperado(sessaoAtual) : 0
  const vendas =
    movimentosDaSessao
      .filter((m) => m.tipo === "venda")
      .reduce((s, m) => s + m.valor, 0) ?? 0
  const suprimentos =
    movimentosDaSessao
      .filter((m) => m.tipo === "suprimento")
      .reduce((s, m) => s + m.valor, 0) ?? 0
  const sangrias =
    movimentosDaSessao
      .filter((m) => m.tipo === "sangria")
      .reduce((s, m) => s + m.valor, 0) ?? 0

  // "Movimentações do turno" mostra tudo que compõe o caixa desde a abertura:
  // o próprio fundo de troco inicial (sintético, não é uma Movimentacao real)
  // seguido das movimentações de fato (mais recente primeiro). Como a abertura
  // é sempre o evento mais antigo do turno, ela entra no fim da lista.
  const linhasDoTurno = sessaoAtual
    ? [
        ...movimentosDaSessao,
        {
          id: `abertura-${sessaoAtual.id}`,
          tipo: "abertura" as const,
          valor: sessaoAtual.valorAbertura,
          motivo: messages.initialFloat,
          operador: sessaoAtual.operadorAbertura,
          criadoEm: sessaoAtual.abertoEm,
        },
      ]
    : []

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-3 sm:p-6">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-(--color-accent)" />
        <h2 className="text-[18px] font-semibold text-(--color-text-primary)">{messages.title}</h2>
      </div>
      <p className="-mt-3 text-[12px] text-(--color-text-secondary)">
        {messages.description}
      </p>

      {!sessaoAtual ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-raised) px-3 py-10 text-center sm:py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-(--color-accent)">
            <Wallet size={22} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-medium text-(--color-text-primary)">
              {messages.noOpenRegister}
            </p>
            <p className="text-[12px] text-(--color-text-secondary)">
              {messages.noOpenDetails}
            </p>
          </div>
          <Button onClick={() => setAbrirOpen(true)} className="gap-2">
            <Unlock size={15} />
            {messages.openRegister}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 *:last:col-span-2 sm:gap-3 lg:grid-cols-5 lg:*:last:col-span-1">
            <StatCard label={messages.openingAmount} value={formatCurrency(sessaoAtual.valorAbertura)} />
            <StatCard label={messages.sales} value={formatCurrency(vendas)} tone="success" />
            <StatCard label={messages.deposits} value={formatCurrency(suprimentos)} tone="success" />
            <StatCard label={messages.payouts} value={formatCurrency(sangrias)} tone="danger" />
            <StatCard label={messages.expectedAmount} value={formatCurrency(esperado)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setMovDialog("sangria")}>
              <ArrowDownCircle size={15} className="text-(--color-danger)" />
              {messages.sangria}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setMovDialog("suprimento")}>
              <ArrowUpCircle size={15} className="text-(--color-success)" />
              {messages.suprimento}
            </Button>
            <Button className="gap-2" onClick={() => setFecharOpen(true)}>
              <Lock size={15} />
              {messages.closeRegister}
            </Button>
          </div>

          <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface-raised) p-2.5 sm:p-4">
            <span className="text-[13px] font-semibold text-(--color-text-primary)">
              {messages.shiftMovements}
            </span>
            <DataTable
              columns={criarColunasMovimentacoes(messages)}
              data={linhasDoTurno.map((m) => ({
                id: m.id,
                tipo: m.tipo,
                motivo: m.motivo,
                operador: m.operador,
                criadoEm: m.criadoEm,
                valor: m.valor,
              }))}
              keyField="id"
              emptyMessage={messages.noMovements}
            />
          </div>
        </>
      )}

      {isAdmin && (
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface-raised) p-2.5 sm:p-4">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-(--color-text-primary)">
            <History size={15} />
            {messages.registerHistory}
          </span>
          <DataTable
            columns={colunasHistorico}
            data={historico.map((sessao) => {
              const diff = calcularDiferenca(sessao)
              const status: HistoricoCaixaRow["status"] = Math.abs(diff) < 0.005 ? "Confere" : diff > 0 ? "Sobra" : "Falta"
              return {
                id: sessao.id,
                periodo: `${formatHora(sessao.abertoEm)} — ${sessao.fechadoEm ? formatHora(sessao.fechadoEm) : "—"}`,
                operador: sessao.operadorAbertura,
                esperado: calcularValorEsperado(sessao),
                contado: sessao.valorContado ?? 0,
                diferenca: diff,
                status,
                sessao,
              }
            })}
            keyField="id"
            emptyMessage={messages.noHistory}
            className="max-h-[400px] overflow-auto"
          />
        </div>
      )}

      <AbrirCaixaDialog open={abrirOpen} onOpenChange={setAbrirOpen} />
      {movDialog && (
        <MovimentacaoDialog
          tipo={movDialog}
          open={movDialog !== null}
          onOpenChange={(open) => !open && setMovDialog(null)}
        />
      )}
      <FecharCaixaDialog
        open={fecharOpen}
        onOpenChange={setFecharOpen}
        onFechamentoConfirmado={setResumoFechamento}
      />

      <ResumoFechamentoDialog
        resumo={resumoFechamento}
        onOpenChange={() => setResumoFechamento(null)}
      />

      <Dialog open={isAdmin && !!sessaoConferencia} onOpenChange={(open) => !open && setSessaoConferencia(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{messages.registerReconciliation}</DialogTitle>
          </DialogHeader>
          {sessaoConferencia && (
            <div className="flex min-w-0 flex-col gap-4 py-2">
              <span className="text-[13px] text-(--color-text-secondary)">
                {formatHora(sessaoConferencia.abertoEm)} —{" "}
                {sessaoConferencia.fechadoEm ? formatHora(sessaoConferencia.fechadoEm) : "—"} ·{" "}
                {sessaoConferencia.operadorAbertura}
              </span>

              {(() => {
                const linhas = linhasConferenciaDaSessao(sessaoConferencia)
                if (!linhas) {
                  return (
                    <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-raised) p-4 text-[13px] text-(--color-text-secondary)">
                      {messages.legacyRegister}
                    </div>
                  )
                }
                return (
                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-(--color-text-secondary)">
                      {messages.byMethod}
                    </span>
                    <ConferenciaPorMetodoTable linhas={linhas} />
                  </div>
                )
              })()}

              <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-2 text-[13px]">
                  <span className="text-(--color-text-secondary)">{messages.expectedTotal}</span>
                  <span className="font-semibold text-(--color-text-primary)">
                    {formatCurrency(calcularValorEsperado(sessaoConferencia))}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-2 text-[13px]">
                  <span className="text-(--color-text-secondary)">{messages.reportedTotal}</span>
                  <span className="font-semibold text-(--color-text-primary)">
                    {formatCurrency(sessaoConferencia.valorContado ?? 0)}
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "rounded-xl border border-(--color-border) p-4 text-[13px] font-medium",
                  Math.abs(calcularDiferenca(sessaoConferencia)) < 0.005
                    ? "border-(--color-success)/40 bg-(--color-success)/10 text-(--color-success)"
                    : "border-(--color-warning)/40 bg-(--color-warning)/10 text-(--color-warning)"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{messages.totalDifference}</span>
                  <span>{formatCurrency(Math.abs(calcularDiferenca(sessaoConferencia)))}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSessaoConferencia(null)}>{messages.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
