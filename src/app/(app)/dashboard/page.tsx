"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, TrendingUp, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { MiniLine } from "@/components/shared/MiniLine"
import { CaixaResumoCard } from "@/components/caixa/CaixaResumoCard"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { useAnalyticsStore } from "@/store/analyticsStore"
import { useOrdersStore } from "@/store/ordersStore"
import { useProductsStore } from "@/store/productsStore"

const CARD = "rounded-xl border border-(--color-border) bg-(--color-surface) p-6"
const CARD_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)"
const CARD_VALUE =
  "text-[24px] font-semibold leading-9 tracking-[-0.48px] text-(--color-text-primary) font-(family-name:--font-data)"

export default function DashboardPage() {
  const dashboard = useAnalyticsStore((state) => state.dashboard)
  const insights = useAnalyticsStore((state) => state.insights)
  const loadDashboard = useAnalyticsStore((state) => state.loadDashboard)
  const columns = useOrdersStore((state) => state.columns)
  const orders = useOrdersStore((state) => state.orders)
  const loadOrders = useOrdersStore((state) => state.loadOrders)
  const products = useProductsStore((state) => state.products)
  const loadProducts = useProductsStore((state) => state.loadProducts)

  useEffect(() => {
    void Promise.all([loadDashboard(), loadOrders(), loadProducts()])
      .catch(() => toast.error("Não foi possível carregar o dashboard."))
  }, [loadDashboard, loadOrders, loadProducts])

  const stockAlerts = products.filter(
    (product) => product.status === "Baixo estoque" || product.status === "Esgotado"
  )
  const revenuePoints = dashboard?.revenueSeries.map((point, index, series) => ({
    label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(new Date(`${point.bucketStart}T12:00:00`))
      .replace(".", ""),
    value: point.netRevenueCents / 100,
    display: formatCurrency(point.netRevenueCents / 100),
    highlight: index === series.length - 1,
  })) ?? []

  return (
    <div>
      <PageHeader
        title="Olá, equipe D'Lara"
        subtitle="Aqui está sua visão geral de produção e varejo para hoje."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={cn(CARD, "flex flex-col justify-between gap-6")}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className={CARD_LABEL}>Total Faturamento</span>
              <span className={CARD_VALUE}>
                {formatCurrency((dashboard?.sales.netRevenueCents ?? 0) / 100)}
              </span>
            </div>
            <TrendingUp size={18} className="text-(--color-accent)" />
          </div>
          {revenuePoints.length > 0 ? (
            <MiniLine data={revenuePoints} />
          ) : (
            <p className="text-[12px] text-(--color-text-secondary)">Sem vendas no período.</p>
          )}
        </div>

        <div className={cn(CARD, "flex flex-col justify-between gap-6")}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className={CARD_LABEL}>Pedidos Ativos</span>
              <span className={CARD_VALUE}>{dashboard?.serviceOrders.openCount ?? 0}</span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-border/50 px-2.5 py-1 text-[12px] font-semibold text-(--color-text-primary)">
              Produção
            </span>
          </div>
          <div className="flex items-center justify-between text-[14px] text-(--color-text-primary)">
            <span>{dashboard?.serviceOrders.completedCount ?? 0} concluídos</span>
            <span>{dashboard?.serviceOrders.overdueOpenCount ?? 0} atrasados</span>
          </div>
        </div>

        <div className={cn(CARD, "flex flex-col gap-5")}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className={CARD_LABEL}>Alerta de Estoque</span>
              <span className={CARD_VALUE}>
                {(dashboard?.inventory.lowStockCount ?? 0) + (dashboard?.inventory.soldOutCount ?? 0)} Itens
              </span>
            </div>
            <TriangleAlert size={18} className="text-(--color-warning)" />
          </div>
          <div className="flex flex-col gap-2">
            {stockAlerts.slice(0, 3).map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-2 text-[14px]">
                <span className="truncate text-(--color-text-primary)">{product.name}</span>
                <span className={product.status === "Esgotado" ? "text-(--color-danger)" : "text-(--color-warning)"}>
                  {product.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CaixaResumoCard />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={cn(CARD, "flex flex-col lg:col-span-2")}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Fluxo de Produção</h2>
            <Link href="/ordens" className="text-[14px] font-semibold text-(--color-accent) hover:underline">
              Ver Quadro
            </Link>
          </div>
          <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
            {columns.map((column) => {
              const cards = orders.filter((order) => order.columnId === column.id)
              const done = column.semanticType === "completed"
              return (
                <div
                  key={column.id}
                  className="flex min-w-56 flex-1 flex-col gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary)">
                      {column.label}
                    </span>
                    <span className="rounded-md bg-border/50 px-1.5 py-0.5 text-[11px] font-semibold text-(--color-text-secondary)">
                      {cards.length}
                    </span>
                  </div>
                  {cards.map((order) => (
                    <div key={order.id} className={cn("rounded-md border border-(--color-border) bg-border/40 p-2.5", done && "opacity-60")}>
                      <p className={cn("truncate text-[13px] font-semibold text-(--color-text-primary)", done && "line-through")}>
                        {order.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-(--color-text-secondary)">{order.client}</p>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        <div className={cn(CARD, "flex flex-col")}>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={18} className="text-(--color-accent)" />
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Insights de IA</h2>
          </div>
          <p className="mb-4 text-[12px] text-(--color-text-secondary)">
            Explicações aprovadas com base nas métricas persistidas
          </p>
          <div className="flex flex-1 flex-col gap-2.5">
            {insights.length === 0 ? (
              <p className="text-[12px] text-(--color-text-secondary)">Nenhum insight aprovado.</p>
            ) : insights.map((insight) => (
              <div key={insight.id} className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3">
                <p className="text-[13px] text-(--color-text-primary)">{insight.text}</p>
                <span className="mt-2 block text-[10px] uppercase text-(--color-text-secondary)">
                  {insight.provider} · {insight.modelId}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/inteligencia"
            className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface-raised) px-4 py-2.5 text-[14px] font-semibold text-(--color-text-primary)"
          >
            Ver na Inteligência
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
