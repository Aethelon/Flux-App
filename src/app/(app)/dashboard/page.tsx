"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ArrowRight, PackagePlus, TrendingUp, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { useLocale } from "@/components/layout/LocaleProvider"
import { DASHBOARD_MESSAGES } from "@/lib/dashboard-messages"
import type { Locale } from "@/lib/locale"
import { PageHeader } from "@/components/shared/PageHeader"
import { MiniLine } from "@/components/shared/MiniLine"
import { CaixaResumoCard } from "@/components/caixa/CaixaResumoCard"
import { formatCurrency } from "@/lib/formatters"
import { hasPermission } from "@/lib/accessControl"
import { cn } from "@/lib/utils"
import { type Recommendation, useAnalyticsStore } from "@/store/analyticsStore"
import { useOrdersStore } from "@/store/ordersStore"
import { useUserStore } from "@/store/userStore"

const CARD = "min-w-0 rounded-xl border border-(--color-border) bg-(--color-surface) p-4 sm:p-6"
const CARD_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)"
const CARD_VALUE =
  "text-[24px] font-semibold leading-9 tracking-[-0.48px] text-(--color-text-primary) font-(family-name:--font-data)"

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

function monthLabel(bucketStart: string, locale: Locale): string {
  const label = new Intl.DateTimeFormat(locale, { month: "short" })
    .format(new Date(`${bucketStart}T12:00:00`))
    .replace(".", "")
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function replenishmentQuantity(recommendation: Recommendation): number | null {
  if (
    typeof recommendation.proposedValue !== "object"
    || recommendation.proposedValue === null
    || !("quantity" in recommendation.proposedValue)
  ) return null
  const quantity = recommendation.proposedValue.quantity
  return typeof quantity === "number" ? quantity : null
}

export default function DashboardPage() {
  const { locale } = useLocale()
  const messages = DASHBOARD_MESSAGES[locale]
  const user = useUserStore((state) => state.user)
  const canViewIntelligence = hasPermission(user?.role, user?.permissions, "intelligence.view")
  const canViewCash = hasPermission(user?.role, user?.permissions, "cash.view")
  const canViewInventory = hasPermission(user?.role, user?.permissions, "inventory.view")
  const canViewOrders = hasPermission(user?.role, user?.permissions, "orders.view")
  const dashboard = useAnalyticsStore((state) => state.dashboard)
  const trendDashboard = useAnalyticsStore((state) => state.trendDashboard)
  const recommendations = useAnalyticsStore((state) => state.recommendations)
  const loadDashboard = useAnalyticsStore((state) => state.loadDashboard)
  const columns = useOrdersStore((state) => state.columns)
  const orders = useOrdersStore((state) => state.orders)
  const loadOrders = useOrdersStore((state) => state.loadOrders)

  useEffect(() => {
    if (!user) return
    void Promise.all([loadDashboard(undefined, canViewIntelligence), loadOrders()])
      .catch(() => toast.error(messages.loadError))
  }, [canViewIntelligence, loadDashboard, loadOrders, messages.loadError, user])

  const stockAlerts = dashboard?.inventory.alerts ?? []
  const alertCount = (dashboard?.inventory.lowStockCount ?? 0) + (dashboard?.inventory.soldOutCount ?? 0)
  const revenuePoints = (trendDashboard?.revenueSeries ?? dashboard?.revenueSeries ?? [])
    .map((point, index, series) => ({
    label: monthLabel(point.bucketStart, locale),
    value: point.netRevenueCents / 100,
    display: formatCurrency(point.netRevenueCents / 100),
    highlight: index === series.length - 1,
  }))
  const serviceOrderSeries = trendDashboard?.serviceOrderSeries
    ?? dashboard?.serviceOrderSeries
    ?? []
  const maximumCompletedOrders = Math.max(
    ...serviceOrderSeries.map((point) => point.completedCount),
    1
  )
  const productionBars = serviceOrderSeries.map((point, index, series) => ({
    label: monthLabel(point.bucketStart, locale),
    value: (point.completedCount / maximumCompletedOrders) * 100,
    display: messages.completed(point.completedCount),
    highlight: index === series.length - 1,
  }))
  const pendingColumnIds = new Set(
    columns
      .filter((column) => (
        column.semanticType === "open"
        && column.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("pendent")
      ))
      .map((column) => column.id)
  )
  const pendingCount = orders.filter((order) => (
    order.status === "open" && pendingColumnIds.has(order.columnId)
  )).length
  const inProductionCount = Math.max(
    0,
    (dashboard?.serviceOrders.openCount ?? 0) - pendingCount
  )
  const replenishmentRecommendations = recommendations.filter((recommendation) => (
    recommendation.type === "replenishment" && recommendation.state === "pending"
  ))

  return (
    <div>
      <PageHeader
        title={messages.title}
        subtitle={messages.subtitle}
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className={cn(CARD, "flex flex-col justify-between gap-6")}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className={CARD_LABEL}>{messages.revenue}</span>
              <span className={CARD_VALUE}>
                {formatCurrency((dashboard?.sales.netRevenueCents ?? 0) / 100)}
              </span>
            </div>
            <TrendingUp size={18} className="text-(--color-accent)" />
          </div>
          {revenuePoints.length > 0 ? (
            <MiniLine data={revenuePoints} />
          ) : (
            <p className="text-[12px] text-(--color-text-secondary)">{messages.noSales}</p>
          )}
        </div>

        <div className={cn(CARD, "flex flex-col justify-between gap-6")}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className={CARD_LABEL}>{messages.activeOrders}</span>
              <span className={CARD_VALUE}>{dashboard?.serviceOrders.openCount ?? 0}</span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-border/50 px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-(--color-accent)" />
              <span className="text-[12px] font-semibold text-(--color-text-primary)">{messages.production}</span>
            </span>
          </div>
          {productionBars.length > 0 && <MiniBars data={productionBars} />}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[14px] text-(--color-text-primary)">
            <span>{messages.inProduction(inProductionCount)}</span>
            <span>{messages.pending(pendingCount)}</span>
          </div>
        </div>

        <div className={cn(CARD, "flex flex-col gap-5")}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className={CARD_LABEL}>{messages.stockAlert}</span>
              <span className={CARD_VALUE}>
                {messages.stockItems(alertCount)}
              </span>
            </div>
            <TriangleAlert size={18} className="text-(--color-warning)" />
          </div>
          <div className="flex flex-col gap-2">
            {stockAlerts.map((product) => (
              <div key={product.productId} className="flex items-center justify-between gap-2 text-[14px]">
                <span className="truncate text-(--color-text-primary)">{product.name}</span>
                <span className={cn("shrink-0", product.status === "sold_out" ? "text-(--color-danger)" : "text-(--color-warning)")}>
                  {product.status === "sold_out" ? messages.soldOut : messages.lowStock}
                </span>
              </div>
            ))}
            {alertCount > 3 && canViewInventory && (
              <Link
                href="/inventario"
                className="mt-1 text-[13px] font-medium text-(--color-accent) hover:underline"
              >
                {messages.viewAll(alertCount)}
              </Link>
            )}
          </div>
        </div>
      </div>

      {canViewCash && (
        <div className="mt-6">
          <CaixaResumoCard />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className={cn(
          CARD,
          "flex h-80 max-h-[70vh] min-h-80 flex-col overflow-hidden sm:h-[32rem]",
          canViewIntelligence ? "lg:col-span-2" : "lg:col-span-3"
        )}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">{messages.productionFlow}</h2>
            {canViewOrders && (
              <Link href="/ordens" className="text-[14px] font-semibold text-(--color-accent) hover:underline">
                {messages.viewBoard}
              </Link>
            )}
          </div>
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
            {columns.map((column) => {
              const cards = orders.filter((order) => order.columnId === column.id)
              const done = column.semanticType === "completed"
              return (
                <div
                  key={column.id}
                  className="flex min-h-0 min-w-56 flex-1 flex-col gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary)">
                      {column.label}
                    </span>
                    <span className="rounded-md bg-border/50 px-1.5 py-0.5 text-[11px] font-semibold text-(--color-text-secondary)">
                      {cards.length}
                    </span>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-1">
                    {cards.map((order) => (
                      <div key={order.id} className={cn("shrink-0 rounded-md border border-(--color-border) bg-border/40 p-2.5", done && "opacity-60")}>
                        <p className={cn("truncate text-[13px] font-semibold text-(--color-text-primary)", done && "line-through")}>
                          {order.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-(--color-text-secondary)">{order.client}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {canViewIntelligence && (
          <div className={cn(
            CARD,
            "flex flex-col sm:h-[32rem] sm:max-h-[70vh] sm:min-h-80 sm:overflow-hidden"
          )}>
            <div className="mb-1 flex items-center gap-2">
              <PackagePlus size={18} className="text-(--color-accent)" />
              <h2 className="text-[18px] font-semibold text-(--color-text-primary)">{messages.replenishment}</h2>
            </div>
            <p className="mb-4 text-[12px] text-(--color-text-secondary)">
              {messages.replenishmentDescription}
            </p>
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 sm:overflow-y-auto sm:pr-1">
              {replenishmentRecommendations.length === 0 ? (
                <p className="text-[12px] text-(--color-text-secondary)">{messages.emptyReplenishment}</p>
              ) : replenishmentRecommendations.map((recommendation) => {
                const quantity = replenishmentQuantity(recommendation)
                return (
                  <div key={recommendation.id} className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 wrap-anywhere text-[13px] font-medium text-(--color-text-primary)">
                        {recommendation.product.name}
                      </p>
                      <span className="shrink-0 rounded-full bg-(--color-warning)/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-(--color-warning)">
                        {quantity === null ? messages.review : messages.restock}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-(--color-text-secondary)">
                      {quantity === null
                        ? messages.reviewMessage
                        : messages.restockMessage(quantity)}
                    </p>
                    <span className="mt-2 block text-[10px] text-(--color-text-secondary)">
                      {messages.confidence}: {messages.confidenceLevels[recommendation.confidenceLabel]}
                    </span>
                  </div>
                )
              })}
            </div>
            <Link
              href="/inteligencia"
              className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface-raised) px-4 py-2.5 text-[14px] font-semibold text-(--color-text-primary)"
            >
              {messages.viewIntelligence}
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
