import Link from "next/link"
import { TrendingUp, TriangleAlert, Sparkles, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { MiniLine } from "@/components/shared/MiniLine"
import { CaixaPanel } from "@/components/dashboard/CaixaPanel"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { INITIAL_PRODUCTS } from "@/data/products"
import { INITIAL_COLUMNS, INITIAL_ORDERS, CLOSED_COLUMN_IDS, visibleOrders } from "@/data/orders"
import { INITIAL_HISTORY, revenueByType, REVENUE_TREND, TREND_LABELS } from "@/data/history"
import { SEASONALITIES } from "@/data/insights"

// Total Faturamento = vendas da Frente de Caixa (produtos) + serviços,
// derivado das compras registradas no Histórico (mesma fonte da tela de
// Histórico). A série mensal é a soma das séries por tipo do Histórico, com
// o último ponto (mês atual, destacado) igual ao total derivado.
const REVENUE_BY_TYPE = revenueByType(INITIAL_HISTORY)
const TOTAL_REVENUE = REVENUE_BY_TYPE.produto + REVENUE_BY_TYPE.servico

const REVENUE_POINTS = [
  ...REVENUE_TREND.produto.map((v, i) => v + REVENUE_TREND.servico[i]),
  TOTAL_REVENUE,
].map((value, i) => ({
  label: TREND_LABELS[i],
  value,
  display: formatCurrency(value),
  highlight: i === TREND_LABELS.length - 1,
}))

// Pedidos concluídos por mês (mesma janela da série de faturamento).
const PRODUCTION_BARS = [
  { label: "Fev", value: 58, display: "14 pedidos" },
  { label: "Mar", value: 75, display: "18 pedidos" },
  { label: "Abr", value: 67, display: "16 pedidos" },
  { label: "Mai", value: 88, display: "21 pedidos" },
  { label: "Jun", value: 100, display: "24 pedidos" },
  { label: "Jul", value: 54, display: "13 pedidos", highlight: true },
]

const CARD = "rounded-xl border border-(--color-border) bg-(--color-surface) p-6"
const CARD_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)"
const CARD_VALUE =
  "text-[24px] font-semibold leading-9 tracking-[-0.48px] text-(--color-text-primary) font-(family-name:--font-data)"

// Mini gráfico de barras: linha de barras com altura fixa (para o height % funcionar)
// e linha de rótulos separada, alinhadas pela mesma largura flex. Ao passar o mouse
// sobre uma coluna, um tooltip mostra o valor real do mês.
function MiniBars({
  data,
}: {
  data: { label: string; value: number; display: string; highlight?: boolean }[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-14 items-end gap-2">
        {data.map((bar) => (
          <div key={bar.label} className="group relative flex h-full flex-1 items-end">
            <div
              className={cn(
                "w-full rounded-t-sm transition-opacity group-hover:opacity-80",
                bar.highlight ? "bg-(--color-accent)" : "bg-border"
              )}
              style={{ height: `${bar.value}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-(--color-border) bg-(--color-surface-raised) px-2 py-1 text-[11px] font-semibold text-(--color-text-primary) opacity-0 shadow-md transition-opacity group-hover:opacity-100">
              {bar.display}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {data.map((bar) => (
          <span
            key={bar.label}
            className="flex-1 text-center text-[11px] font-medium text-(--color-text-secondary)"
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  // Alerta de estoque derivado da mesma fonte do Inventário (coesão entre telas).
  const stockAlerts = INITIAL_PRODUCTS.filter(
    (p) => p.status === "Baixo estoque" || p.status === "Esgotado"
  )

  // Mesmas ordens visíveis no board (concluídas antigas ficam só no Histórico).
  const boardOrders = visibleOrders(INITIAL_ORDERS)
  // Pedidos ativos derivados das mesmas ordens exibidas no Fluxo de Produção:
  // tudo que não está numa coluna encerrada (concluído/cancelado) conta como
  // ativo. "Em produção" = ativas que já saíram de Pendente.
  const pendingOrders = boardOrders.filter((o) => o.columnId === "pendente").length
  const activeOrders = boardOrders.filter(
    (o) => !CLOSED_COLUMN_IDS.includes(o.columnId)
  ).length
  const inProductionOrders = activeOrders - pendingOrders

  return (
    <div>
      <PageHeader
        title="Olá, equipe D'Lara"
        subtitle="Aqui está sua visão geral de produção e varejo para hoje."
      />

      {/* Cards de resumo executivo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Total Faturamento */}
        <div className={cn(CARD, "flex flex-col justify-between gap-6")}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className={CARD_LABEL}>Total Faturamento</span>
              <span className={CARD_VALUE}>{formatCurrency(TOTAL_REVENUE)}</span>
            </div>
            <TrendingUp size={18} className="text-(--color-accent)" />
          </div>
          <MiniLine data={REVENUE_POINTS} />
        </div>

        {/* Pedidos Ativos */}
        <div className={cn(CARD, "flex flex-col justify-between gap-6")}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className={CARD_LABEL}>Pedidos Ativos</span>
              <span className={CARD_VALUE}>{activeOrders}</span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-border/50 px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-(--color-accent)" />
              <span className="text-[12px] font-semibold text-(--color-text-primary)">Produção</span>
            </span>
          </div>

          <MiniBars data={PRODUCTION_BARS} />

          <div className="flex items-center justify-between text-[14px] text-(--color-text-primary)">
            <span>{inProductionOrders} em produção</span>
            <span>{pendingOrders} pendentes</span>
          </div>
        </div>

        {/* Alerta de Estoque */}
        <div className={cn(CARD, "flex flex-col gap-5")}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className={CARD_LABEL}>Alerta de Estoque</span>
              <span className={CARD_VALUE}>
                {stockAlerts.length} {stockAlerts.length === 1 ? "Item" : "Itens"}
              </span>
            </div>
            <TriangleAlert size={18} className="text-(--color-warning)" />
          </div>

          <div className="flex flex-col gap-2">
            {stockAlerts.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-[14px]">
                <span className="truncate text-(--color-text-primary)">{p.name}</span>
                <span
                  className={cn(
                    "shrink-0 font-semibold",
                    p.status === "Esgotado"
                      ? "text-(--color-danger)"
                      : "text-(--color-warning)"
                  )}
                >
                  {p.status === "Esgotado" ? "Esgotado" : "Baixo"}
                </span>
              </div>
            ))}
            {stockAlerts.length > 3 && (
              <Link
                href="/inventario"
                className="mt-1 text-[13px] font-medium text-(--color-accent) hover:underline"
              >
                Ver todos os {stockAlerts.length} itens
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Caixa físico — abertura/fechamento e movimentações do turno */}
      <div className="mt-6">
        <CaixaPanel />
      </div>

      {/* Seção inferior: fluxo de produção + insights de IA */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Fluxo de Produção — colunas reais de Ordens, em modo leitura */}
        <div className={cn(CARD, "lg:col-span-2 flex flex-col")}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">
              Fluxo de Produção
            </h2>
            <Link
              href="/ordens"
              className="text-[14px] font-semibold text-(--color-accent) hover:underline"
            >
              Ver Quadro
            </Link>
          </div>

          {/* Mesmo padrão do board de Ordens: colunas largas com rolagem horizontal. */}
          <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
            {INITIAL_COLUMNS.map((col) => {
              const cards = boardOrders.filter((o) => o.columnId === col.id)
              const done = col.id === "concluido"
              return (
                <div
                  key={col.id}
                  className="flex min-w-56 flex-1 flex-col gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: `var(${col.color})` }}
                      />
                      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary)">
                        {col.label}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-md bg-border/50 px-1.5 py-0.5 text-[11px] font-semibold text-(--color-text-secondary)">
                      {cards.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {cards.map((order) => (
                      <div
                        key={order.id}
                        className={cn(
                          "rounded-md border border-(--color-border) bg-border/40 p-2.5",
                          done && "opacity-60"
                        )}
                      >
                        <p
                          className={cn(
                            "truncate text-[13px] font-semibold text-(--color-text-primary)",
                            done && "line-through"
                          )}
                        >
                          {order.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-(--color-text-secondary)">
                          {order.client}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Insights de IA — card de Sazonalidades espelhado da Inteligência */}
        <div className={cn(CARD, "flex flex-col")}>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={18} className="text-(--color-accent)" />
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">
              Insights de IA
            </h2>
          </div>
          <p className="mb-4 text-[12px] text-(--color-text-secondary)">
            Sazonalidades que ajustam a curva preditiva de demanda
          </p>

          <div className="flex flex-1 flex-col gap-2.5">
            {SEASONALITIES.map((s) => (
              <div
                key={s.title}
                className="flex items-center justify-between gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-(--color-text-primary)">
                      {s.title}
                    </span>
                    <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase text-(--color-accent)">
                      Prev IA
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-(--color-text-secondary)">{s.detail}</p>
                </div>
                <span className="shrink-0 text-[14px] font-semibold text-(--color-success)">
                  {s.impact}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/inteligencia"
            className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface-raised) px-4 py-2.5 text-[14px] font-semibold text-(--color-text-primary) transition-colors hover:bg-border/40"
          >
            Ver na Inteligência
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
