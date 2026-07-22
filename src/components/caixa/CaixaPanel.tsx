"use client"

import { useState } from "react"
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
import { formatCurrency, parsePriceInput } from "@/lib/formatters"
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
    <div className="flex flex-col gap-1.5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary)">
        {label}
      </span>
      <span
        className={cn(
          "text-[24px] font-semibold tracking-[-0.48px]",
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
  { label: string; icon: typeof ArrowDownCircle; tone: "danger" | "success" | "accent" | "neutral" }
> = {
  abertura: { label: "Abertura", icon: Unlock, tone: "neutral" },
  sangria: { label: "Sangria", icon: ArrowDownCircle, tone: "danger" },
  suprimento: { label: "Suprimento", icon: ArrowUpCircle, tone: "success" },
  venda: { label: "Venda", icon: ShoppingCart, tone: "accent" },
}

function TipoBadge({ tipo }: { tipo: MovimentacaoTipo | "abertura" }) {
  const { label, icon: Icon, tone } = TIPO_CONFIG[tipo]
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
      {label}
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
  const operador = useOperadorLogado()
  const abrirCaixa = useCaixaStore((s) => s.abrirCaixa)
  const [valor, setValor] = useState("")

  function handleConfirm() {
    const parsed = parsePriceInput(valor)
    if (parsed < 0) {
      toast.error("Informe um valor de abertura válido.")
      return
    }
    abrirCaixa(operador, parsed)
    toast.success(`Caixa aberto com ${formatCurrency(parsed)} de fundo de troco.`)
    setValor("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir caixa</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Label htmlFor="valor-abertura">Valor de abertura (fundo de troco)</Label>
          <Input
            id="valor-abertura"
            inputMode="decimal"
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="0,00"
          />
          <span className="text-[12px] text-(--color-text-secondary)">
            Operador: {operador}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Abrir caixa</Button>
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
  return (
    <Dialog open={!!resumo} onOpenChange={(open) => !open && onOpenChange(open)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Resumo do fechamento</DialogTitle>
        </DialogHeader>
        {resumo && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-(--color-text-secondary)">
                Conferência por método
              </span>
              <ConferenciaPorMetodoTable linhas={resumo.porMetodo} />
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-(--color-text-secondary)">O que o sistema calculou</span>
                <span className="font-semibold text-(--color-text-primary)">
                  {formatCurrency(resumo.sistema)}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-(--color-text-secondary)">O que o funcionário informou</span>
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
                <span>Diferença total</span>
                <span>{formatCurrency(Math.abs(resumo.diferenca))}</span>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
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
  const operador = useOperadorLogado()
  const registrarMovimentacao = useCaixaStore((s) => s.registrarMovimentacao)
  const [valor, setValor] = useState("")
  const [motivo, setMotivo] = useState("")
  const label = tipo === "sangria" ? "Sangria" : "Suprimento"

  function handleConfirm() {
    const parsed = parsePriceInput(valor)
    if (parsed <= 0) {
      toast.error("Informe um valor maior que zero.")
      return
    }
    if (!motivo.trim()) {
      toast.error("Informe o motivo.")
      return
    }
    registrarMovimentacao(tipo, parsed, motivo.trim(), operador)
    toast.success(`${label} de ${formatCurrency(parsed)} registrada.`)
    setValor("")
    setMotivo("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="valor-mov">Valor</Label>
            <Input
              id="valor-mov"
              inputMode="decimal"
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,00"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-mov">Motivo</Label>
            <Input
              id="motivo-mov"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={
                tipo === "sangria" ? "Ex.: depósito bancário" : "Ex.: reforço de troco"
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Confirmar {label.toLowerCase()}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Rótulo de exibição de cada forma de pagamento — reaproveitado no modal de
// fechamento e no resumo de conferência por método.
const METODO_LABEL: Record<MetodoPagamento, string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  pix: "Pix",
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
  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border)">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-(--color-surface-raised) text-(--color-text-secondary)">
            <th className="px-3 py-2 text-left font-medium">Método</th>
            <th className="px-3 py-2 text-right font-medium">Esperado</th>
            <th className="px-3 py-2 text-right font-medium">Informado</th>
            <th className="px-3 py-2 text-right font-medium">Diferença</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => {
            const confere = Math.abs(linha.diferenca) < 0.005
            return (
              <tr key={linha.metodo} className="border-t border-(--color-border)">
                <td className="px-3 py-2 text-(--color-text-primary)">
                  {METODO_LABEL[linha.metodo]}
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
  const operador = useOperadorLogado()
  const sessao = useCaixaStore((s) => s.sessaoAtual)
  const fecharCaixa = useCaixaStore((s) => s.fecharCaixa)
  const [valores, setValores] = useState<ValoresFechamento>({
    dinheiro: "",
    cartao_credito: "",
    cartao_debito: "",
    pix: "",
  })

  if (!sessao) return null

  const sessaoAtual = sessao

  function handleChange(chave: keyof ValoresFechamento, valor: string) {
    setValores((prev) => ({ ...prev, [chave]: valor.replace(/[^\d.,]/g, "") }))
  }

  function handleConfirm() {
    const totalContado = Object.values(valores).reduce(
      (soma, valor) => soma + parsePriceInput(valor),
      0
    )

    if (totalContado <= 0) {
      toast.error("Informe ao menos um valor para fechar o caixa.")
      return
    }

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

    fecharCaixa(operador, totalContado, informadoPorMetodo)
    onFechamentoConfirmado?.({
      sistema: sistemaCalculado,
      informado: totalContado,
      diferenca,
      porMetodo,
    })
    toast.success("Caixa fechado com sucesso.")
    setValores({ dinheiro: "", cartao_credito: "", cartao_debito: "", pix: "" })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <p className="text-[13px] text-(--color-text-secondary)">
            Informe os valores recebidos em cada método de pagamento.
          </p>

          <div className="flex flex-col gap-3">
            {METODOS_FECHAMENTO.map((metodo) => (
              <div
                key={metodo}
                className="flex items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
              >
                <span className="text-[14px] font-medium text-(--color-text-primary)">
                  {METODO_LABEL[metodo]}
                </span>
                <Input
                  id={`valor-${metodo}`}
                  inputMode="decimal"
                  autoFocus={metodo === "dinheiro"}
                  value={valores[metodo]}
                  onChange={(e) => handleChange(metodo, e.target.value)}
                  placeholder="0,00"
                  className="w-36"
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Fechar caixa</Button>
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

const colunasMovimentacoes: Column<MovimentoTurnoRow>[] = [
  {
    key: "tipo",
    label: "Tipo",
    render: (row) => <TipoBadge tipo={row.tipo} />,
  },
  {
    key: "motivo",
    label: "Descrição",
    render: (row) => <span className="text-[14px] text-(--color-text-primary)">{row.motivo}</span>,
  },
  {
    key: "operador",
    label: "Operador",
    render: (row) => <span className="text-[13px] text-(--color-text-secondary)">{row.operador}</span>,
  },
  {
    key: "criadoEm",
    label: "Hora",
    render: (row) => <span className="text-[13px] text-(--color-text-secondary)">{formatHora(row.criadoEm)}</span>,
  },
  {
    key: "valor",
    label: "Valor",
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

// Colunas do histórico de caixas. Fica dentro do componente (mais abaixo, via
// função) por precisar do handler que abre a conferência por método de cada
// sessão — não pode ser uma constante de módulo como colunasMovimentacoes.
function criarColunasHistorico(
  onVerConferencia: (sessao: CaixaSessao) => void
): Column<HistoricoCaixaRow>[] {
  return [
    {
      key: "periodo",
      label: "Período",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-[14px] text-(--color-text-primary)">{row.periodo}</span>
          <span className="text-[11px] text-(--color-text-secondary)">{row.operador}</span>
        </div>
      ),
    },
    {
      key: "esperado",
      label: "Esperado",
      render: (row) => <span className="text-[13px] text-(--color-text-secondary)">{formatCurrency(row.esperado)}</span>,
    },
    {
      key: "contado",
      label: "Contado",
      render: (row) => <span className="text-[13px] text-(--color-text-secondary)">{formatCurrency(row.contado)}</span>,
    },
    {
      key: "diferenca",
      label: "Saldo",
      render: (row) => (
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
            row.status === "Confere"
              ? "bg-(--color-success)/10 text-(--color-success)"
              : "bg-(--color-warning)/10 text-(--color-warning)"
          )}
        >
          {row.status === "Confere" ? "Confere" : `${row.status} ${formatCurrency(Math.abs(row.diferenca))}`}
        </span>
      ),
    },
    {
      key: "conferencia",
      label: "Conferência",
      className: "text-right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[12px]"
          onClick={() => onVerConferencia(row.sessao)}
        >
          Ver por método
        </Button>
      ),
    },
  ]
}

// Módulo de caixa físico (abertura, fechamento, sangria, suprimento, vendas em
// dinheiro do turno e histórico de turnos fechados). É o conteúdo principal da
// tela /caixa; o Dashboard mostra só um resumo (CaixaResumoCard) com link pra cá.
export function CaixaPanel() {
  const sessaoAtual = useCaixaStore((s) => s.sessaoAtual)
  const historico = useCaixaStore((s) => s.historico)
  const getMovimentacoesDaSessao = useCaixaStore((s) => s.getMovimentacoesDaSessao)

  const [abrirOpen, setAbrirOpen] = useState(false)
  const [movDialog, setMovDialog] = useState<MovimentacaoManual | null>(null)
  const [fecharOpen, setFecharOpen] = useState(false)
  const [resumoFechamento, setResumoFechamento] = useState<ResumoFechamento | null>(null)
  const [sessaoConferencia, setSessaoConferencia] = useState<CaixaSessao | null>(null)

  const colunasHistorico = criarColunasHistorico(setSessaoConferencia)

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

  // "Movimentações do turno" mostra tudo que afeta a gaveta desde a abertura:
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
          motivo: "Fundo de troco inicial",
          operador: sessaoAtual.operadorAbertura,
          criadoEm: sessaoAtual.abertoEm,
        },
      ]
    : []

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-(--color-accent)" />
        <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Caixa</h2>
      </div>
      <p className="-mt-3 text-[12px] text-(--color-text-secondary)">
        Abertura, fechamento, sangria, suprimento e vendas em dinheiro do caixa físico.
      </p>

      {!sessaoAtual ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-raised) py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-(--color-accent)">
            <Wallet size={22} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-medium text-(--color-text-primary)">
              Nenhum caixa aberto no momento
            </p>
            <p className="text-[12px] text-(--color-text-secondary)">
              Abra o caixa para registrar sangrias, suprimentos e o fechamento do turno.
            </p>
          </div>
          <Button onClick={() => setAbrirOpen(true)} className="gap-2">
            <Unlock size={15} />
            Abrir caixa
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Valor de abertura" value={formatCurrency(sessaoAtual.valorAbertura)} />
            <StatCard label="Vendas em dinheiro" value={formatCurrency(vendas)} tone="success" />
            <StatCard label="Suprimentos" value={formatCurrency(suprimentos)} tone="success" />
            <StatCard label="Sangrias" value={formatCurrency(sangrias)} tone="danger" />
            <StatCard label="Valor esperado" value={formatCurrency(esperado)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setMovDialog("sangria")}>
              <ArrowDownCircle size={15} className="text-(--color-danger)" />
              Sangria
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setMovDialog("suprimento")}>
              <ArrowUpCircle size={15} className="text-(--color-success)" />
              Suprimento
            </Button>
            <Button className="gap-2" onClick={() => setFecharOpen(true)}>
              <Lock size={15} />
              Fechar caixa
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface-raised) p-4">
            <span className="text-[13px] font-semibold text-(--color-text-primary)">
              Movimentações do turno
            </span>
            <DataTable
              columns={colunasMovimentacoes}
              data={linhasDoTurno.map((m) => ({
                id: m.id,
                tipo: m.tipo,
                motivo: m.motivo,
                operador: m.operador,
                criadoEm: m.criadoEm,
                valor: m.valor,
              }))}
              keyField="id"
              emptyMessage="Nenhuma movimentação registrada ainda."
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface-raised) p-4">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-(--color-text-primary)">
          <History size={15} />
          Histórico de caixas
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
          emptyMessage="Nenhum caixa fechado até agora."
          className="max-h-[400px] overflow-auto"
        />
      </div>

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

      <Dialog open={!!sessaoConferencia} onOpenChange={(open) => !open && setSessaoConferencia(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Conferência do caixa</DialogTitle>
          </DialogHeader>
          {sessaoConferencia && (
            <div className="flex flex-col gap-4 py-2">
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
                      Este caixa foi fechado antes da conferência por método existir — só o total
                      geral está disponível para esta sessão.
                    </div>
                  )
                }
                return (
                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-(--color-text-secondary)">
                      Conferência por método
                    </span>
                    <ConferenciaPorMetodoTable linhas={linhas} />
                  </div>
                )
              })()}

              <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-(--color-text-secondary)">O que o sistema calculou</span>
                  <span className="font-semibold text-(--color-text-primary)">
                    {formatCurrency(calcularValorEsperado(sessaoConferencia))}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-(--color-text-secondary)">O que o funcionário informou</span>
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
                  <span>Diferença total</span>
                  <span>{formatCurrency(Math.abs(calcularDiferenca(sessaoConferencia)))}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSessaoConferencia(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}