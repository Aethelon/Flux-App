"use client"

import Link from "next/link"
import { useLocale } from "@/components/layout/LocaleProvider"
import { DASHBOARD_MESSAGES } from "@/lib/dashboard-messages"
import { Wallet, ArrowRight, Lock, Unlock } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { useCaixaStore, calcularValorEsperado } from "@/store/caixaStore"

// Resumo do caixa físico no Dashboard — o módulo completo (abertura,
// fechamento, sangria, suprimento e vendas por método) vive em /caixa.
export function CaixaResumoCard() {
  const { locale } = useLocale()
  const messages = DASHBOARD_MESSAGES[locale].cash
  const sessaoAtual = useCaixaStore((s) => s.sessaoAtual)
  const aberto = sessaoAtual !== null
  const esperado = sessaoAtual ? calcularValorEsperado(sessaoAtual) : 0
  const movimentacoesHoje = sessaoAtual?.movimentacoes.length ?? 0

  return (
    <Link
      href="/caixa"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-(--color-border) bg-(--color-surface) p-4 transition-colors hover:border-primary/40 sm:flex-nowrap sm:p-6"
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            aberto ? "bg-(--color-success)/10 text-(--color-success)" : "bg-primary/10 text-(--color-accent)"
          )}
        >
          <Wallet size={20} />
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-(--color-text-primary)">{messages.title}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                aberto
                  ? "bg-(--color-success)/10 text-(--color-success)"
                  : "bg-(--color-text-secondary)/10 text-(--color-text-secondary)"
              )}
            >
              {aberto ? <Unlock size={11} /> : <Lock size={11} />}
              {aberto ? messages.open : messages.closed}
            </span>
          </div>
          <span className="text-[12px] text-(--color-text-secondary)">
            {aberto
              ? messages.summary(formatCurrency(esperado), movimentacoesHoje)
              : messages.closedDescription}
          </span>
        </div>
      </div>
      <span className="ml-auto flex shrink-0 items-center gap-1 text-[13px] font-medium text-(--color-accent)">
        {messages.view}
        <ArrowRight size={14} />
      </span>
    </Link>
  )
}
