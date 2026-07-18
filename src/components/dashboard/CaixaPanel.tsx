"use client"

import { useState } from "react"
import {
  Lock,
  Unlock,
  ArrowDownCircle,
  ArrowUpCircle,
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
import {
  useCaixaStore,
  calcularValorEsperado,
  calcularDiferenca,
} from "@/store/caixaStore"
import { useUserStore } from "@/store/userStore"
import type { MovimentacaoTipo } from "@/types/caixa"

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

function TipoBadge({ tipo }: { tipo: MovimentacaoTipo }) {
  const isSangria = tipo === "sangria"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
        isSangria
          ? "bg-(--color-danger)/10 text-(--color-danger)"
          : "bg-(--color-success)/10 text-(--color-success)"
      )}
    >
      {isSangria ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
      {isSangria ? "Sangria" : "Suprimento"}
    </span>
  )
}

// Modal de abertura — pede só o fundo de troco inicial.
function AbrirCaixaDialog({
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

// Modal reaproveitado para sangria e suprimento — só muda o rótulo/tipo.
function MovimentacaoDialog({
  tipo,
  open,
  onOpenChange,
}: {
  tipo: MovimentacaoTipo
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

// Modal de fechamento — mostra o esperado e pede a contagem física.
function FecharCaixaDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const operador = useOperadorLogado()
  const sessao = useCaixaStore((s) => s.sessaoAtual)
  const fecharCaixa = useCaixaStore((s) => s.fecharCaixa)
  const [valorContado, setValorContado] = useState("")

  if (!sessao) return null

  const esperado = calcularValorEsperado(sessao)
  const contadoParsed = parsePriceInput(valorContado)
  const diferenca = valorContado ? contadoParsed - esperado : 0

  function handleConfirm() {
    if (!valorContado) {
      toast.error("Informe o valor contado no caixa.")
      return
    }
    fecharCaixa(operador, contadoParsed)
    toast.success("Caixa fechado com sucesso.")
    setValorContado("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center justify-between rounded-lg bg-(--color-surface-raised) px-3 py-2 text-[13px]">
            <span className="text-(--color-text-secondary)">Valor esperado</span>
            <span className="font-semibold text-(--color-text-primary)">
              {formatCurrency(esperado)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="valor-contado">Valor contado (dinheiro físico)</Label>
            <Input
              id="valor-contado"
              inputMode="decimal"
              autoFocus
              value={valorContado}
              onChange={(e) => setValorContado(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,00"
            />
          </div>
          {valorContado && (
            <div
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-[12px] font-medium",
                Math.abs(diferenca) < 0.005
                  ? "bg-(--color-success)/10 text-(--color-success)"
                  : "bg-(--color-warning)/10 text-(--color-warning)"
              )}
            >
              <span>
                {Math.abs(diferenca) < 0.005 ? "Confere" : diferenca > 0 ? "Sobra" : "Falta"}
              </span>
              <span>{formatCurrency(Math.abs(diferenca))}</span>
            </div>
          )}
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

// Módulo de caixa físico embutido no Dashboard (abertura, fechamento, sangria,
// suprimento, movimentações do turno e histórico) — em vez de uma tela à parte.
export function CaixaPanel() {
  const sessaoAtual = useCaixaStore((s) => s.sessaoAtual)
  const historico = useCaixaStore((s) => s.historico)

  const [abrirOpen, setAbrirOpen] = useState(false)
  const [movDialog, setMovDialog] = useState<MovimentacaoTipo | null>(null)
  const [fecharOpen, setFecharOpen] = useState(false)

  const esperado = sessaoAtual ? calcularValorEsperado(sessaoAtual) : 0
  const suprimentos =
    sessaoAtual?.movimentacoes
      .filter((m) => m.tipo === "suprimento")
      .reduce((s, m) => s + m.valor, 0) ?? 0
  const sangrias =
    sessaoAtual?.movimentacoes
      .filter((m) => m.tipo === "sangria")
      .reduce((s, m) => s + m.valor, 0) ?? 0

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-(--color-accent)" />
        <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Caixa</h2>
      </div>
      <p className="-mt-3 text-[12px] text-(--color-text-secondary)">
        Abertura, fechamento, sangria e suprimento do caixa físico.
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Valor de abertura" value={formatCurrency(sessaoAtual.valorAbertura)} />
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
            {sessaoAtual.movimentacoes.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-(--color-text-secondary)">
                Nenhuma sangria ou suprimento registrado ainda.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {sessaoAtual.movimentacoes.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-(--color-surface) px-3 py-2 text-[13px]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <TipoBadge tipo={m.tipo} />
                      <span className="truncate text-(--color-text-primary)">{m.motivo}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[11px] text-(--color-text-secondary)">
                        {formatHora(m.criadoEm)}
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          m.tipo === "sangria" ? "text-(--color-danger)" : "text-(--color-success)"
                        )}
                      >
                        {m.tipo === "sangria" ? "− " : "+ "}
                        {formatCurrency(m.valor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface-raised) p-4">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-(--color-text-primary)">
          <History size={15} />
          Histórico de caixas
        </span>
        {historico.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-(--color-text-secondary)">
            Nenhum caixa fechado até agora.
          </p>
        ) : (
          <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto pr-1">
            {historico.map((sessao) => {
              const diff = calcularDiferenca(sessao)
              return (
                <div
                  key={sessao.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-(--color-surface) px-3 py-2 text-[13px]"
                >
                  <div className="flex flex-col">
                    <span className="text-(--color-text-primary)">
                      {formatHora(sessao.abertoEm)} — {sessao.fechadoEm ? formatHora(sessao.fechadoEm) : "—"}
                    </span>
                    <span className="text-[11px] text-(--color-text-secondary)">
                      {sessao.operadorAbertura}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[12px]">
                    <span className="text-(--color-text-secondary)">
                      Esperado {formatCurrency(calcularValorEsperado(sessao))}
                    </span>
                    <span className="text-(--color-text-secondary)">
                      Contado {formatCurrency(sessao.valorContado ?? 0)}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 font-medium",
                        Math.abs(diff) < 0.005
                          ? "bg-(--color-success)/10 text-(--color-success)"
                          : "bg-(--color-warning)/10 text-(--color-warning)"
                      )}
                    >
                      {Math.abs(diff) < 0.005
                        ? "Confere"
                        : `${diff > 0 ? "Sobra" : "Falta"} ${formatCurrency(Math.abs(diff))}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AbrirCaixaDialog open={abrirOpen} onOpenChange={setAbrirOpen} />
      {movDialog && (
        <MovimentacaoDialog
          tipo={movDialog}
          open={movDialog !== null}
          onOpenChange={(open) => !open && setMovDialog(null)}
        />
      )}
      <FecharCaixaDialog open={fecharOpen} onOpenChange={setFecharOpen} />
    </section>
  )
}
