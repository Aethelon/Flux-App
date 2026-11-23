"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Boxes,
  Banknote,
  CalendarDays,
  Check,
  DollarSign,
  FileText,
  Lightbulb,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  UsersRound,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useLocale } from "@/components/layout/LocaleProvider"
import { INTELLIGENCE_MESSAGES, type IntelligenceMessages } from "@/lib/intelligence-messages"
import type { Locale } from "@/lib/locale"
import { HTTPError } from "ky"
import { RevenueForecastChart } from "@/components/analytics/RevenueForecastChart"
import { PageHeader } from "@/components/shared/PageHeader"
import { MiniLine } from "@/components/shared/MiniLine"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/formatters"
import { buildRevenueForecastChart, monthLabel } from "@/lib/revenue-forecast"
import { cn } from "@/lib/utils"
import {
  type AiInsight,
  type DashboardData,
  type ForecastRun,
  type Recommendation,
  useAnalyticsStore,
} from "@/store/analyticsStore"
import { useOrdersStore } from "@/store/ordersStore"
import type { KanbanColumn, Order } from "@/types/order"

type Period = "monthly" | "quarterly"
type RankingType = "product" | "service"
type RunningAction = "forecast" | "recommendation" | "insight" | "refresh" | null
type MetricTone = "success" | "warning" | "danger" | "accent"

const SALES_RANKING_LIMIT = 10

const PERIOD_OPTIONS: Period[] = ["monthly", "quarterly"]

const KPI_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)"
const KPI_VALUE =
  "mt-4 text-[28px] font-semibold leading-none tracking-[-0.56px] text-(--color-text-primary) font-(family-name:--font-data)"

const CONFIDENCE_LABEL = {
  low: "confidenceLow",
  medium: "confidenceMedium",
  high: "confidenceHigh",
  unavailable: "unavailable",
} as const satisfies Record<ForecastRun["confidenceLabel"], keyof IntelligenceMessages>

const FORECAST_STATUS = {
  completed: "forecastCompleted",
  insufficient_data: "insufficientData",
  poor_data_quality: "poorQuality",
  baseline_not_beaten: "baselineNotBeaten",
} as const satisfies Record<ForecastRun["status"], keyof IntelligenceMessages>

const FORECAST_METHOD = {
  ols_trend: "linearTrend",
  seasonal_ols: "seasonalTrend",
  damped_trend: "dampedTrend",
  naive_last_value: "naiveLastValue",
  unavailable: "unavailable",
} as const satisfies Record<ForecastRun["method"], keyof IntelligenceMessages>

const STATE_LABEL = {
  pending: "awaitingReview",
  accepted: "applied",
  rejected: "rejected",
} as const satisfies Record<Recommendation["state"], keyof IntelligenceMessages>

const INSIGHT_LABEL = {
  summary: "executiveSummary",
  strength: "strength",
  risk: "attention",
  recommendation: "recommendation",
} as const satisfies Record<AiInsight["type"], keyof IntelligenceMessages>

const INSIGHT_TYPES: AiInsight["type"][] = [
  "summary",
  "strength",
  "risk",
  "recommendation",
]

function SurfaceCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-(--color-border) bg-(--color-surface)", className)}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[16px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)">
      {children}
    </h2>
  )
}

function Segmented({
  value,
  onChange,
}: {
  value: Period
  onChange: (value: Period) => void
}) {
  const { locale } = useLocale()
  const messages = INTELLIGENCE_MESSAGES[locale]
  return (
    <div className="inline-flex rounded-lg border border-(--color-border) bg-(--color-surface) p-0.5">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === option
              ? "bg-(--color-surface-raised) text-(--color-text-primary)"
              : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
          )}
        >
          {messages[option]}
        </button>
      ))}
    </div>
  )
}

function currentRange(period: Period) {
  const now = new Date()
  const from = period === "monthly"
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() - 2, 1)

  return {
    from: from.toISOString(),
    to: now.toISOString(),
    bucket: "month" as const,
    topBy: "net_revenue" as const,
    topLimit: 20,
  }
}

function decimal(value: number, digits: number, locale: Locale) {
  return value.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  })
}

function formatPercentage(value: number | null, locale: Locale, digits = 0) {
  if (value === null) return "—"
  return `${decimal(value * 100, digits, locale)}%`
}

function formatReportRange(range: NonNullable<AiInsight["reportRange"]>) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: range.timezone,
  }).formatRange(new Date(range.from), new Date(range.to))
}

function confidenceTone(label: ForecastRun["confidenceLabel"]) {
  if (label === "high") return "text-(--color-success)"
  if (label === "medium") return "text-(--color-warning)"
  if (label === "low") return "text-(--color-danger)"
  return "text-(--color-text-secondary)"
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {}
}

function recommendationValue(recommendation: Recommendation, messages: IntelligenceMessages) {
  const value = objectValue(recommendation.proposedValue)
  if (recommendation.type === "replenishment") {
    const quantity = typeof value.quantity === "number" ? value.quantity : null
    return quantity === null
      ? messages.reviewRestock
      : messages.restockUnits(quantity)
  }
  if (recommendation.type === "promotion") {
    const rate = typeof value.discountRate === "number" ? value.discountRate : null
    const price = typeof value.suggestedPriceCents === "number"
      ? formatCurrency(value.suggestedPriceCents / 100)
      : null
    if (rate !== null && price) {
      return messages.applyPromotion((rate * 100).toFixed(0), price)
    }
    return messages.reviewPromotion
  }
  return messages.manualStockReview
}

function numericValue(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "number" ? value[key] : null
}

function recommendationEvidence(recommendation: Recommendation, messages: IntelligenceMessages, locale: Locale) {
  const evidence = objectValue(recommendation.evidenceMetrics)
  if (recommendation.type === "replenishment") {
    const replenishment = objectValue(evidence.replenishment)
    const dailyDemand = numericValue(replenishment, "meanDailyDemand")
    const daysOfCover = numericValue(replenishment, "daysOfCover")
    const stockoutProbability = numericValue(replenishment, "stockoutProbability")
    const urgent = (stockoutProbability ?? 0) >= 0.5
      || (daysOfCover !== null && daysOfCover <= (numericValue(replenishment, "leadTimeDays") ?? 0))
    return {
      badge: urgent ? messages.urgent : messages.restock,
      badgeClass: urgent
        ? "bg-(--color-danger)/15 text-(--color-danger)"
        : "bg-(--color-warning)/15 text-(--color-warning)",
      detail: [
        dailyDemand === null ? null : messages.dailyDemand(decimal(dailyDemand, 1, locale)),
        daysOfCover === null ? null : messages.coverageDays(decimal(daysOfCover, 1, locale)),
        stockoutProbability === null
          ? null
          : messages.stockoutProbability((stockoutProbability * 100).toFixed(0)),
      ].filter(Boolean).join(" · "),
    }
  }

  const promotion = objectValue(evidence.promotion)
  const turnover = numericValue(evidence, "unitTurnover")
  const excessUnits = numericValue(promotion, "excessUnits")
  return {
    badge: recommendation.type === "promotion" ? messages.lowStockTurnover : messages.review,
    badgeClass: "bg-(--color-warning)/15 text-(--color-warning)",
    detail: [
      turnover === null ? null : messages.turnoverMetric(decimal(turnover, 2, locale)),
      excessUnits === null ? null : messages.excessUnits(excessUnits.toFixed(0)),
    ].filter(Boolean).join(" · "),
  }
}

type SeasonalForecastPoint = ForecastRun["points"][number]

interface SeasonalSuggestion {
  id: string
  period: string
  events: string[]
  action: string
  reason: string
  products: string | null
}

function seasonalSuggestions(
  points: SeasonalForecastPoint[],
  salesProducts: DashboardData["topProducts"]["data"],
  reviewProducts: Recommendation[],
  messages: IntelligenceMessages,
  locale: Locale,
): SeasonalSuggestion[] {
  const today = new Date().toISOString().slice(0, 10)
  const leaders = salesProducts.slice(0, 3).map((product) => product.name)
  const review = reviewProducts.slice(0, 3).map((item) => item.product.name)
  const matchingProducts = (pattern: RegExp) => salesProducts
    .filter((product) => pattern.test(product.name))
    .slice(0, 3)
    .map((product) => product.name)

  return points.flatMap((point) => {
    const events = point.calendarEvents.filter((event) => event.endsOn >= today)
    if (events.length === 0) return []
    const names = events.map((event) => event.name)
    let action = messages.seasonChangeAction
    let reason = messages.seasonChangeReason
    let products = leaders

    if (names.includes("Black Friday")) {
      action = messages.blackFridayAction
      reason = messages.blackFridayReason
      products = review.length > 0 ? review : leaders
    } else if (names.includes("Período de Natal")) {
      action = messages.christmasAction
      reason = messages.christmasReason
      products = leaders
    } else if (names.includes("Dia das Crianças")) {
      const children = matchingProducts(/KIDS|INFANTIL|CRIANÇ|BEBÊ|BEBE/i)
      action = children.length > 0
        ? messages.childrenAction
        : messages.childrenValidate
      reason = children.length > 0
        ? messages.childrenReason
        : messages.childrenNoData
      products = children
    } else if (names.includes("Volta às aulas")) {
      const school = matchingProducts(/ESCOLAR|MOCHILA|LANCHEIRA|INFANTIL|KIDS/i)
      action = school.length > 0
        ? messages.schoolAction
        : messages.schoolValidate
      reason = school.length > 0
        ? messages.schoolReason
        : messages.schoolNoData
      products = school
    } else if (names.includes("Réveillon")) {
      action = messages.newYearAction
      reason = messages.newYearReason
      products = leaders
    } else if (names.includes("Verão")) {
      const summer = matchingProducts(/BANHO|TOALHA|PRAIA|PISCINA|LEVE/i)
      action = messages.summerAction
      reason = messages.summerReason
      products = summer.length > 0 ? summer : leaders
    } else if (names.includes("Primavera")) {
      action = messages.springAction
      reason = messages.springReason
      products = leaders
    } else if (names.includes("Inverno")) {
      action = messages.winterAction
      reason = messages.winterReason
      products = leaders
    }

    return [{
      id: point.id,
      period: monthLabel(point.bucketStart, locale),
      events: names,
      action,
      reason,
      products: products.length > 0 ? products.join(", ") : null,
    }]
  })
}

function KpiLineCard({
  label,
  value,
  hint,
  hintClass,
  icon: Icon,
  iconClass,
  points,
  lineColor,
}: {
  label: string
  value: string
  hint: string
  hintClass?: string
  icon: LucideIcon
  iconClass: string
  points: Array<{ label: string; value: number; display: string; highlight?: boolean }>
  lineColor?: string
}) {
  const { locale } = useLocale()
  const messages = INTELLIGENCE_MESSAGES[locale]
  return (
    <SurfaceCard className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <span className={KPI_LABEL}>{label}</span>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", iconClass)}>
          <Icon size={16} />
        </span>
      </div>
      <p className={KPI_VALUE}>{value}</p>
      <p className={cn("mt-2 mb-4 text-[12px] font-medium", hintClass ?? "text-(--color-text-secondary)")}>
        {hint}
      </p>
      {points.length > 0 ? (
        <MiniLine data={points} color={lineColor} />
      ) : (
        <p className="mt-auto text-[11px] text-(--color-text-secondary)">{messages.noSeries}</p>
      )}
    </SurfaceCard>
  )
}

function OrderStatusChart({
  dashboard,
  columns,
  orders,
}: {
  dashboard: DashboardData | null
  columns: KanbanColumn[]
  orders: Order[]
}) {
  const { locale } = useLocale()
  const messages = INTELLIGENCE_MESSAGES[locale]
  const slices = columns
    .map((column) => ({
      ...column,
      count: orders.filter((order) => order.columnId === column.id).length,
    }))
    .filter((column) => column.count > 0)
  const total = orders.length
  let consumed = 0
  const gradient = slices.map((slice) => {
    const from = total === 0 ? 0 : (consumed / total) * 100
    consumed += slice.count
    const to = total === 0 ? 0 : (consumed / total) * 100
    const color = slice.color.startsWith("--") ? `var(${slice.color})` : slice.color
    return `${color} ${from}% ${to}%`
  }).join(", ")

  return (
    <SurfaceCard className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <span className={KPI_LABEL}>{messages.serviceOrders}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-(--color-info)/15 text-(--color-info)">
          <Wrench size={16} />
        </span>
      </div>
      <p className={KPI_VALUE}>{total}</p>
      <p className="mt-2 mb-5 text-[12px] font-medium text-(--color-text-secondary)">
        {messages.openOrderCounts(dashboard?.serviceOrders.openCount ?? 0, dashboard?.serviceOrders.overdueOpenCount ?? 0)}
      </p>
      <div className="mt-auto flex items-center gap-4">
        <div
          className="size-20 shrink-0 rounded-full"
          style={{ background: total === 0 ? "var(--color-surface-raised)" : `conic-gradient(${gradient})` }}
          role="img"
          aria-label={messages.orderDistribution(total)}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          {slices.map((slice) => (
            <div key={slice.id} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="flex min-w-0 items-center gap-1.5 text-(--color-text-secondary)">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color.startsWith("--") ? `var(${slice.color})` : slice.color }}
                />
                <span className="truncate">{slice.label}</span>
              </span>
              <span className="font-semibold text-(--color-text-primary)">{slice.count}</span>
            </div>
          ))}
          {slices.length === 0 && (
            <p className="text-[11px] text-(--color-text-secondary)">{messages.noOrders}</p>
          )}
        </div>
      </div>
    </SurfaceCard>
  )
}

function CashCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  iconClass: string
}) {
  return (
    <SurfaceCard className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <span className={KPI_LABEL}>{label}</span>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", iconClass)}>
          <Icon size={16} />
        </span>
      </div>
      <p className={KPI_VALUE}>{value}</p>
      <p className="mt-2 text-[12px] font-medium text-(--color-text-secondary)">{hint}</p>
    </SurfaceCard>
  )
}

function RecommendationActions({
  recommendation,
  onReview,
}: {
  recommendation: Recommendation
  onReview: (id: string, decision: "accepted" | "rejected") => Promise<void>
}) {
  const { locale } = useLocale()
  const messages = INTELLIGENCE_MESSAGES[locale]
  const [reviewing, setReviewing] = useState(false)

  if (recommendation.state !== "pending") {
    return (
      <span className={cn(
        "rounded-md px-2 py-1 text-[10px] font-semibold uppercase",
        recommendation.state === "accepted"
          ? "bg-(--color-success)/15 text-(--color-success)"
          : "bg-(--color-danger)/15 text-(--color-danger)"
      )}>
        {recommendation.state === "accepted" && recommendation.type !== "promotion"
          ? messages.reviewed
          : messages[STATE_LABEL[recommendation.state]]}
      </span>
    )
  }

  async function review(decision: "accepted" | "rejected") {
    setReviewing(true)
    try {
      await onReview(recommendation.id, decision)
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={reviewing}
        aria-label={messages.rejectRecommendation(recommendation.product.name)}
        onClick={() => void review("rejected")}
      >
        <X size={14} />
      </Button>
      <Button
        size="sm"
        disabled={reviewing}
        aria-label={recommendation.type === "promotion"
          ? messages.applyRecommendation(recommendation.product.name)
          : messages.reviewRecommendation(recommendation.product.name)}
        onClick={() => void review("accepted")}
      >
        {reviewing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        {recommendation.type === "promotion" ? messages.apply : messages.review}
      </Button>
    </div>
  )
}

function RecommendationList({
  items,
  emptyMessage,
  onReview,
}: {
  items: Recommendation[]
  emptyMessage: string
  onReview: (id: string, decision: "accepted" | "rejected") => Promise<void>
}) {
  const { locale } = useLocale()
  const messages = INTELLIGENCE_MESSAGES[locale]
  if (items.length === 0) {
    return <p className="text-[12px] text-(--color-text-secondary)">{emptyMessage}</p>
  }

  return (
    <div className="flex flex-col gap-3 lg:max-h-[420px] lg:overflow-y-auto lg:pr-1">
      {items.map((recommendation) => {
        const evidence = recommendationEvidence(recommendation, messages, locale)
        return (
          <div
            key={recommendation.id}
            className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3"
          >
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 wrap-anywhere text-[14px] font-semibold text-(--color-text-primary)">
                    {recommendation.product.name}
                  </p>
                  <span className={cn(
                    "rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase",
                    evidence.badgeClass
                  )}>
                    {evidence.badge}
                  </span>
                </div>
                {evidence.detail && (
                  <p className="mt-1 text-[11px] leading-relaxed text-(--color-text-secondary)">
                    {evidence.detail}
                  </p>
                )}
                <p className="mt-1 text-[12px] leading-relaxed text-(--color-text-secondary)">
                  {recommendationValue(recommendation, messages)}
                </p>
                <p className="mt-2 text-[11px] text-(--color-text-secondary)">
                  {messages.confidence}: {messages[CONFIDENCE_LABEL[recommendation.confidenceLabel]]}
                </p>
              </div>
              <RecommendationActions recommendation={recommendation} onReview={onReview} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MetricCard({
  label,
  value,
  status,
  description,
  reference,
  percent,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  status: string
  description: string
  reference: string
  percent: number | null
  tone: MetricTone
  icon: LucideIcon
}) {
  const style = {
    success: {
      color: "var(--color-success)",
      icon: "bg-(--color-success)/15 text-(--color-success)",
      badge: "bg-(--color-success)/10 text-(--color-success)",
      top: "bg-(--color-success)",
    },
    warning: {
      color: "var(--color-warning)",
      icon: "bg-(--color-warning)/15 text-(--color-warning)",
      badge: "bg-(--color-warning)/10 text-(--color-warning)",
      top: "bg-(--color-warning)",
    },
    danger: {
      color: "var(--color-danger)",
      icon: "bg-(--color-danger)/15 text-(--color-danger)",
      badge: "bg-(--color-danger)/10 text-(--color-danger)",
      top: "bg-(--color-danger)",
    },
    accent: {
      color: "var(--color-accent)",
      icon: "bg-primary/15 text-(--color-accent)",
      badge: "bg-primary/10 text-(--color-accent)",
      top: "bg-(--color-accent)",
    },
  }[tone]
  return (
    <SurfaceCard className="relative flex min-h-[222px] flex-col overflow-hidden p-5">
      <div className={cn("absolute inset-x-0 top-0 h-1", style.top)} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", style.icon)}>
            <Icon size={17} />
          </span>
          <span className={KPI_LABEL}>{label}</span>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
          style.badge
        )}>
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: style.color }} />
          {status}
        </span>
      </div>
      <p className="mt-5 text-[30px] font-semibold leading-none tracking-[-0.6px] text-(--color-text-primary)">
        {value}
      </p>
      {percent !== null && (
        <div
          className="mt-5 h-2 overflow-hidden rounded-full bg-(--color-surface-raised)"
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.max(0, Math.min(100, percent))}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, percent))}%`,
              backgroundColor: style.color,
            }}
          />
        </div>
      )}
      <div className="mt-auto border-t border-(--color-border) pt-4">
        <p className="text-[12px] leading-relaxed text-(--color-text-primary)">{description}</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-(--color-text-secondary)">
          {reference}
        </p>
      </div>
    </SurfaceCard>
  )
}

function SalesRankingTable({
  title,
  items,
}: {
  title: string
  items: DashboardData["topProducts"]["data"]
}) {
  const { locale } = useLocale()
  const messages = INTELLIGENCE_MESSAGES[locale]
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-(--color-border) bg-(--color-surface-raised) px-5 py-3.5">
        <CardTitle>{title}</CardTitle>
      </div>
      <Table className="max-sm:[&_th]:whitespace-normal">
        <TableHeader>
          <TableRow className="border-(--color-border) hover:bg-transparent">
            <TableHead>{messages.item}</TableHead>
            <TableHead>{messages.barcode}</TableHead>
            <TableHead className="text-right">{messages.sales}</TableHead>
            <TableHead className="text-right">{messages.revenue}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.productId} className="border-(--color-border)">
              <TableCell className="font-medium text-(--color-text-primary) max-sm:max-w-44 max-sm:whitespace-normal max-sm:wrap-anywhere">{item.name}</TableCell>
              <TableCell className="text-(--color-text-secondary)">{item.barcode ?? "—"}</TableCell>
              <TableCell className="text-right">{messages.units(item.unitsSold)}</TableCell>
              <TableCell className="text-right font-medium text-(--color-success)">
                {formatCurrency(item.netRevenueCents / 100)}
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="px-4 py-8 text-center whitespace-normal text-(--color-text-secondary)">
                {messages.noSales}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </SurfaceCard>
  )
}

export default function InteligenciaPage() {
  const { locale } = useLocale()
  const messages = INTELLIGENCE_MESSAGES[locale]
  const dashboard = useAnalyticsStore((state) => state.dashboard)
  const trendDashboard = useAnalyticsStore((state) => state.trendDashboard)
  const forecasts = useAnalyticsStore((state) => state.forecasts)
  const recommendations = useAnalyticsStore((state) => state.recommendations)
  const insights = useAnalyticsStore((state) => state.insights)
  const insightAvailability = useAnalyticsStore((state) => state.insightAvailability)
  const insightRunStatus = useAnalyticsStore((state) => state.insightRunStatus)
  const loadDashboard = useAnalyticsStore((state) => state.loadDashboard)
  const loadIntelligence = useAnalyticsStore((state) => state.loadIntelligence)
  const runForecasts = useAnalyticsStore((state) => state.runForecasts)
  const runRecommendations = useAnalyticsStore((state) => state.runRecommendations)
  const runInsights = useAnalyticsStore((state) => state.runInsights)
  const reviewRecommendation = useAnalyticsStore((state) => state.reviewRecommendation)
  const columns = useOrdersStore((state) => state.columns)
  const orders = useOrdersStore((state) => state.orders)
  const loadOrders = useOrdersStore((state) => state.loadOrders)
  const [period, setPeriod] = useState<Period>("monthly")
  const [rankingType, setRankingType] = useState<RankingType>("product")
  const [reportOpen, setReportOpen] = useState(false)
  const [running, setRunning] = useState<RunningAction>(null)

  async function refresh() {
    setRunning("refresh")
    try {
      await loadDashboard(currentRange(period), false)
      await loadIntelligence()
    } catch {
      toast.error(messages.loadError)
    } finally {
      setRunning(null)
    }
  }

  useEffect(() => {
    void Promise.all([
      loadDashboard(currentRange(period), false),
      loadIntelligence(),
      loadOrders(),
    ])
      .catch(() => toast.error(messages.loadError))
  }, [loadDashboard, loadIntelligence, loadOrders, messages.loadError, period])

  useEffect(() => {
    if (insightRunStatus !== "pending" && insightRunStatus !== "processing") return
    const interval = window.setInterval(() => {
      void loadIntelligence().then(() => {
        const status = useAnalyticsStore.getState().insightRunStatus
        if (status !== "pending" && status !== "processing") {
          setReportOpen(true)
        }
      }).catch(() => undefined)
    }, 1_500)
    return () => window.clearInterval(interval)
  }, [insightRunStatus, loadIntelligence])

  async function execute(
    actionName: Exclude<RunningAction, "refresh" | null>,
    action: () => Promise<void>,
    successMessage: string,
  ) {
    setRunning(actionName)
    try {
      await action()
      toast.success(successMessage)
    } catch (error) {
      const body = error instanceof HTTPError
        ? await error.response.json<{ code?: string }>().catch(() => null)
        : null
      toast.error(body?.code === "AI_INPUT_UNAVAILABLE"
        ? messages.reportHistoryError
        : messages.runError)
    } finally {
      setRunning(null)
    }
  }

  async function generateReport() {
    if (insightAvailability === "unavailable") {
      toast.error(messages.providerError)
      return
    }
    await execute("insight", runInsights, messages.reportRequested)
    setReportOpen(true)
  }

  async function handleRecommendationReview(
    id: string,
    decision: "accepted" | "rejected",
  ) {
    const isManualReview = recommendations.some((item) =>
      item.id === id && item.type === "overstock_review"
    )
    try {
      await reviewRecommendation(id, decision)
      toast.success(decision === "accepted"
        ? isManualReview
          ? messages.reviewSuccess
          : messages.applySuccess
        : messages.rejectionSuccess)
    } catch {
      toast.error(decision === "accepted"
        ? isManualReview
          ? messages.reviewError
          : messages.applyError
        : messages.rejectionError)
    }
  }

  const revenuePoints = trendDashboard?.revenueSeries.map((point, index, series) => ({
    label: monthLabel(point.bucketStart, locale),
    value: point.netRevenueCents / 100,
    display: formatCurrency(point.netRevenueCents / 100),
    highlight: index === series.length - 1,
  })) ?? []
  const salesPoints = trendDashboard?.revenueSeries.map((point, index, series) => ({
    label: monthLabel(point.bucketStart, locale),
    value: point.completedSaleCount,
    display: messages.salesCount(point.completedSaleCount),
    highlight: index === series.length - 1,
  })) ?? []
  const inventoryPoints = trendDashboard?.inventorySeries.map((point, index, series) => ({
    label: monthLabel(point.bucketStart, locale),
    value: point.soldOutCount + point.lowStockCount,
    display: messages.itemsCount(point.soldOutCount + point.lowStockCount),
    highlight: index === series.length - 1,
  })) ?? []

  const revenueForecast = forecasts.find((forecast) => forecast.targetType === "monthly_revenue")
  const demandForecasts = forecasts.filter((forecast) => forecast.targetType === "product_demand")

  const revenueDashboard = trendDashboard ?? dashboard
  const forecastChart = useMemo(
    () => revenueDashboard ? buildRevenueForecastChart(revenueDashboard, revenueForecast, locale) : [],
    [locale, revenueDashboard, revenueForecast],
  )

  const visibleInsights = insights.filter((insight) => insight.state !== "rejected")
  const insightReports = PERIOD_OPTIONS.map((option) => {
    const reportInsights = visibleInsights.filter(
      (insight) => insight.reportPeriod === option
    )
    return {
      value: option,
      label: messages[option],
      range: reportInsights[0]?.reportRange,
      groups: INSIGHT_TYPES.map((type) => ({
        type,
        items: reportInsights.filter((insight) => insight.type === type),
      })).filter((group) => group.items.length > 0),
    }
  })
  const insightProcessing = insightRunStatus === "pending"
    || insightRunStatus === "processing"
  const reportVisible = reportOpen || insightProcessing
  const promotionRecommendations = recommendations.filter(
    (recommendation) => recommendation.type !== "replenishment"
  )
  const replenishmentRecommendations = recommendations.filter(
    (recommendation) => recommendation.type === "replenishment"
  )
  const seasonalPoints = revenueForecast?.points.filter(
    (point) => point.seasonalFactor !== null || point.calendarEvents.length > 0
  ) ?? []
  const criticalStock = (dashboard?.inventory.lowStockCount ?? 0)
    + (dashboard?.inventory.soldOutCount ?? 0)
  const cashDifference = (dashboard?.cash.closingDifferenceCents ?? 0) / 100
  const rankedItems = (dashboard?.topProducts.data ?? []).filter((item) => (
    rankingType === "service" ? item.type === "service" : item.type !== "service"
  ))
  const highestSales = [...rankedItems].sort((left, right) => (
    right.netRevenueCents - left.netRevenueCents || right.unitsSold - left.unitsSold
  )).slice(0, SALES_RANKING_LIMIT)
  const lowestSales = [...rankedItems].sort((left, right) => (
    left.netRevenueCents - right.netRevenueCents || left.unitsSold - right.unitsSold
  )).slice(0, SALES_RANKING_LIMIT)
  const seasonalitySuggestions = seasonalSuggestions(
    seasonalPoints,
    (dashboard?.topProducts.data ?? []).filter((item) => item.type !== "service"),
    promotionRecommendations,
    messages,
    locale,
  )
  const unitTurnover = dashboard?.inventory.unitTurnover ?? null
  const coverageDays = dashboard?.inventory.coverageDays ?? null
  const stockoutRate = dashboard?.inventory.stockoutRate ?? null
  const onTimeRate = dashboard?.serviceOrders.onTimeRate ?? null
  const delayRate = onTimeRate === null ? null : 1 - onTimeRate
  const cycleTimeHours = dashboard?.serviceOrders.averageCycleTimeHours ?? null
  const completionRate = dashboard?.serviceOrders.completionRate ?? null
  const averageTicketCents = dashboard?.sales.averageTicketCents ?? null
  const purchaseFrequency = dashboard?.customers.purchaseFrequency ?? null
  const repeatCustomerRate = dashboard?.customers.repeatCustomerRate ?? null
  const unitTurnoverTone: MetricTone = unitTurnover === null
    ? "accent"
    : unitTurnover < 1 ? "warning" : "success"
  const coverageTone: MetricTone = coverageDays === null
    ? "accent"
    : coverageDays < 15 || coverageDays > 90
      ? "danger"
      : coverageDays > 30 ? "warning" : "success"
  const stockoutTone: MetricTone = stockoutRate === null
    ? "accent"
    : stockoutRate > 0.05 ? "danger" : stockoutRate > 0 ? "warning" : "success"
  const delayTone: MetricTone = delayRate === null
    ? "accent"
    : delayRate > 0.1 ? "danger" : delayRate > 0.05 ? "warning" : "success"
  const completionTone: MetricTone = completionRate === null
    ? "accent"
    : completionRate < 0.5 ? "danger" : completionRate < 0.8 ? "warning" : "success"
  const recurrenceTone: MetricTone = repeatCustomerRate === null
    ? "accent"
    : repeatCustomerRate < 0.5 ? "danger" : repeatCustomerRate < 0.8 ? "warning" : "success"

  return (
    <div>
      <PageHeader
        title={messages.title}
        subtitle={messages.subtitle}
      />

      <SurfaceCard className="mb-6 overflow-hidden">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-4 bg-(--color-surface-raised) px-4 py-3.5 sm:px-5",
            reportVisible && "border-b border-(--color-border)"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-(--color-accent)">
              <Sparkles size={16} />
            </span>
            <div>
              <CardTitle>{messages.aiReport}</CardTitle>
              <p className="text-[11px] text-(--color-text-secondary)">
                {messages.aiReportDescription}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!reportVisible ? (
              <Button
                className="gap-2"
                disabled={running !== null || insightProcessing || (visibleInsights.length === 0 && insightAvailability === "unavailable")}
                onClick={() => {
                  if (visibleInsights.length > 0) setReportOpen(true)
                  else void generateReport()
                }}
              >
                {running === "insight" || insightProcessing
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Sparkles size={16} />}
                {insightProcessing
                    ? messages.processingReports
                  : visibleInsights.length > 0
                    ? messages.viewReports
                    : messages.generateReports}
              </Button>
            ) : (
              <>
                <Button
                  className="gap-2"
                  disabled={running !== null || insightProcessing || insightAvailability === "unavailable"}
                  onClick={() => void generateReport()}
                >
                  {running === "insight" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {messages.regenerate}
                </Button>
                <button
                  type="button"
                  aria-label={messages.closeReport}
                  onClick={() => setReportOpen(false)}
                  className="rounded p-1 text-(--color-text-secondary) transition-colors hover:bg-(--color-surface) hover:text-(--color-text-primary)"
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {reportVisible && (
          <div className="p-4 sm:p-5">
            {visibleInsights.length === 0 ? (
              <div className="flex items-center gap-2 text-[13px] text-(--color-text-secondary)">
                {insightProcessing && <Loader2 size={15} className="animate-spin" />}
                <p>
                  {insightProcessing
                    ? messages.reportsProcessing
                    : insightRunStatus === "rejected"
                      ? messages.invalidEvidence
                      : insightRunStatus === "failed"
                        ? messages.reportFailed
                        : insightRunStatus === "budget_exceeded"
                          ? messages.limitReached
                          : messages.noReports}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {insightReports.map((report) => (
                  <section
                    key={report.value}
                    className="rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-4 sm:p-5"
                  >
                    <div className="mb-5 flex items-center justify-between gap-3 border-b border-(--color-border) pb-3">
                      <div>
                        <h3 className="text-[15px] font-semibold text-(--color-text-primary)">
                          {messages.reportTitle(report.label)}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-(--color-text-secondary)">
                          {report.value === "monthly"
                            ? messages.monthlyReportDescription
                            : messages.quarterlyReportDescription}
                        </p>
                        {report.range && (
                          <p className="mt-1 text-[11px] text-(--color-text-secondary)">
                            {messages.reportRange(formatReportRange(report.range))}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-(--color-accent)">
                        {report.label}
                      </span>
                    </div>
                    {report.range === null ? (
                      <p className="text-[13px] text-(--color-text-secondary)">
                        {messages.legacyReport}
                      </p>
                    ) : report.groups.length > 0 ? (
                      <div className="flex flex-col gap-5">
                        {report.groups.map((group) => (
                          <div key={`${report.value}-${group.type}`}>
                            <div className="mb-1.5 flex items-center gap-3">
                              <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-(--color-text-primary)">
                                {group.type === "risk"
                                  ? <TriangleAlert size={14} className="text-(--color-warning)" />
                                  : group.type === "recommendation"
                                    ? <Lightbulb size={14} className="text-(--color-accent)" />
                                    : group.type === "summary"
                                      ? <FileText size={14} className="text-(--color-accent)" />
                                      : <TrendingUp size={14} className="text-(--color-success)" />}
                                {messages[INSIGHT_LABEL[group.type]]}
                              </h4>
                            </div>
                            {group.items.length > 1 ? (
                            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed wrap-anywhere text-(--color-text-secondary)">
                                {group.items.map((insight) => (
                                  <li key={insight.id}>{insight.text}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[13px] leading-relaxed wrap-anywhere text-(--color-text-secondary)">
                                {group.items[0]?.text}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-(--color-text-secondary)">
                        {messages.missingPeriodReport}
                      </p>
                    )}
                  </section>
                ))}
                <p className="xl:col-span-2 border-t border-(--color-border) pt-3 text-[11px] text-(--color-text-secondary)">
                  {messages.reportDisclaimer}
                </p>
              </div>
            )}
          </div>
        )}
      </SurfaceCard>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        <span className="text-[12px] text-(--color-text-secondary)">{messages.period}</span>
        <Segmented value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiLineCard
          label={period === "monthly" ? messages.monthlyRevenue : messages.quarterlyRevenue}
          value={formatCurrency((dashboard?.sales.netRevenueCents ?? 0) / 100)}
          hint={messages.realizedNetRevenue}
          hintClass="text-(--color-success)"
          icon={DollarSign}
          iconClass="bg-(--color-success)/15 text-(--color-success)"
          points={revenuePoints}
        />
        <KpiLineCard
          label={messages.completedSales}
          value={String(dashboard?.sales.completedSaleCount ?? 0)}
          hint={messages.averageSaleHint(formatCurrency((dashboard?.sales.averageTicketCents ?? 0) / 100))}
          icon={ShoppingCart}
          iconClass="bg-primary/15 text-(--color-accent)"
          points={salesPoints}
        />
        <KpiLineCard
          label={messages.criticalStock}
          value={String(criticalStock)}
          hint={messages.criticalStockHint(dashboard?.inventory.soldOutCount ?? 0, dashboard?.inventory.lowStockCount ?? 0)}
          hintClass="text-(--color-warning)"
          icon={TriangleAlert}
          iconClass="bg-(--color-warning)/15 text-(--color-warning)"
          points={inventoryPoints}
          lineColor="--color-danger"
        />
        <OrderStatusChart dashboard={dashboard} columns={columns} orders={orders} />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Wallet size={16} className="text-(--color-text-secondary)" />
          <h2 className="text-[18px] font-semibold text-(--color-text-primary)">{messages.cashAnalysis}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CashCard
            label={messages.openedRegisters}
            value={String(dashboard?.cash.openedSessionCount ?? 0)}
            hint={messages.openedSessions}
            icon={Wallet}
            iconClass="bg-primary/15 text-(--color-accent)"
          />
          <CashCard
            label={messages.closedRegisters}
            value={String(dashboard?.cash.closedSessionCount ?? 0)}
            hint={messages.closedSessions}
            icon={Banknote}
            iconClass="bg-(--color-success)/15 text-(--color-success)"
          />
          <CashCard
            label={messages.cashDifference}
            value={formatCurrency(cashDifference)}
            hint={cashDifference === 0 ? messages.noDiscrepancy : cashDifference > 0 ? messages.cashSurplus : messages.cashShortfall}
            icon={TriangleAlert}
            iconClass={cashDifference === 0
              ? "bg-(--color-success)/15 text-(--color-success)"
              : "bg-(--color-warning)/15 text-(--color-warning)"}
          />
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
        <SurfaceCard className="p-5 lg:col-span-2 lg:h-full">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-(--color-accent)" />
              <div>
                <CardTitle>{messages.revenueForecast}</CardTitle>
                <p className="text-[12px] text-(--color-text-secondary)">
                  {messages.forecastDescription}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={running !== null}
              onClick={() => void execute("forecast", runForecasts, messages.forecastRequested)}
            >
              {running === "forecast" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {messages.updateForecast}
            </Button>
          </div>
          {forecastChart.length > 0 ? (
            <RevenueForecastChart data={forecastChart} />
          ) : (
            <p className="py-12 text-center text-[13px] text-(--color-text-secondary)">
              {messages.noRevenueForecast}
            </p>
          )}
        </SurfaceCard>

        <div className="flex flex-col gap-4 lg:h-full">
          <SurfaceCard className="p-5 lg:h-full">
            <CardTitle>{messages.forecastQuality}</CardTitle>
            <p className="mb-4 text-[12px] text-(--color-text-secondary)">
              {messages.forecastQualityDescription}
            </p>
            {revenueForecast ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3">
                  <p className="text-[11px] text-(--color-text-secondary)">{messages.selectedMethod}</p>
                  <p className="mt-1 text-[13px] font-semibold text-(--color-text-primary)">
                    {messages[FORECAST_METHOD[revenueForecast.method]]}
                  </p>
                </div>
                <div className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3">
                  <p className="text-[11px] text-(--color-text-secondary)">{messages.confidence}</p>
                  <p className={cn("mt-1 text-[13px] font-semibold", confidenceTone(revenueForecast.confidenceLabel))}>
                    {messages[CONFIDENCE_LABEL[revenueForecast.confidenceLabel]]}
                    {revenueForecast.confidenceScore !== null ? ` · ${revenueForecast.confidenceScore.toFixed(0)}%` : ""}
                  </p>
                </div>
                <p className="text-[11px] text-(--color-text-secondary)">
                  {messages[FORECAST_STATUS[revenueForecast.status]]}
                </p>
                {(revenueForecast.method === "naive_last_value"
                  || revenueForecast.method === "damped_trend") && (
                  <p className="rounded-lg bg-(--color-warning)/10 px-3 py-2 text-[11px] leading-relaxed text-(--color-warning)">
                    {messages.forecastCaution}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-(--color-text-secondary)">{messages.noCalculation}</p>
            )}
          </SurfaceCard>

        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SurfaceCard className="p-5 lg:h-[520px]">
          <div className="mb-4 flex items-start gap-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-(--color-accent)">
              <CalendarDays size={16} />
            </span>
            <div>
              <CardTitle>{messages.seasonalOpportunities}</CardTitle>
              <p className="text-[12px] text-(--color-text-secondary)">
                {messages.seasonalDescription}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:h-[440px] lg:overflow-y-auto lg:pr-1">
            {seasonalitySuggestions.map((suggestion) => (
              <article
                key={suggestion.id}
                className="rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-3.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="capitalize text-[12px] font-semibold text-(--color-text-primary)">
                    {suggestion.period}
                  </span>
                  {suggestion.events.map((event) => (
                    <span
                      key={`${suggestion.id}-${event}`}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-(--color-accent)"
                    >
                      {event}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[13px] font-semibold leading-relaxed text-(--color-text-primary)">
                  {suggestion.action}
                </p>
                <div className="mt-2 rounded-lg bg-(--color-surface) px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-(--color-text-secondary)">
                    {messages.whySuggestion}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-(--color-text-secondary)">
                    {suggestion.reason}
                  </p>
                </div>
                {suggestion.products && (
                  <p className="mt-2 text-[11px] text-(--color-text-secondary)">
                    <span className="font-semibold text-(--color-text-primary)">{messages.reviewProducts}</span>{" "}
                    {suggestion.products}
                  </p>
                )}
              </article>
            ))}
            {seasonalitySuggestions.length === 0 && (
              <p className="py-12 text-center text-[12px] text-(--color-text-secondary)">
                {messages.noSeasonal}
              </p>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 lg:h-[520px]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <CardTitle>{messages.replenishment}</CardTitle>
              <p className="text-[12px] text-(--color-text-secondary)">{messages.replenishmentDescription}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              aria-label={messages.updateRecommendations}
              disabled={running !== null}
              onClick={() => void execute("recommendation", runRecommendations, messages.recommendationRequested)}
            >
              {running === "recommendation" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </Button>
          </div>
          <RecommendationList
            items={replenishmentRecommendations}
            emptyMessage={messages.noReplenishment}
            onReview={handleRecommendationReview}
          />
        </SurfaceCard>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-(--color-text-primary)">{messages.salesRankings}</h2>
          <p className="text-[12px] text-(--color-text-secondary)">{messages.salesRankingsDescription}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-(--color-border) bg-(--color-surface) p-0.5">
            {([
              { value: "product" as const, label: messages.product },
              { value: "service" as const, label: messages.service },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={rankingType === option.value}
                onClick={() => setRankingType(option.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  rankingType === option.value
                    ? "bg-(--color-surface-raised) text-(--color-text-primary)"
                    : "text-(--color-text-secondary)"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="gap-2"
            disabled={running !== null}
            onClick={() => void refresh()}
          >
            <RefreshCw size={14} className={running === "refresh" ? "animate-spin" : ""} />
            {messages.refresh}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SalesRankingTable
          title={rankingType === "service" ? messages.highestServiceSales : messages.highestProductSales}
          items={highestSales}
        />
        <SalesRankingTable
          title={rankingType === "service" ? messages.lowestServiceSales : messages.lowestProductSales}
          items={lowestSales}
        />
      </div>

      <SurfaceCard className="mt-4 overflow-hidden">
        <div className="border-b border-(--color-border) bg-(--color-surface-raised) px-5 py-3.5">
          <CardTitle>{messages.forecastDemand}</CardTitle>
        </div>
        <Table className="max-sm:[&_th]:whitespace-normal">
          <TableHeader>
            <TableRow className="border-(--color-border) hover:bg-transparent">
              <TableHead>{messages.product}</TableHead>
              <TableHead>{messages.method}</TableHead>
              <TableHead>{messages.confidence}</TableHead>
              <TableHead className="text-right">{messages.forecast}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demandForecasts.map((forecast) => (
              <TableRow key={forecast.id} className="border-(--color-border)">
                <TableCell className="font-medium text-(--color-text-primary) max-sm:max-w-44 max-sm:whitespace-normal max-sm:wrap-anywhere">
                  {forecast.product?.name ?? messages.product}
                </TableCell>
                <TableCell className="text-(--color-text-secondary)">
                  {messages[FORECAST_METHOD[forecast.method]]}
                </TableCell>
                <TableCell className={confidenceTone(forecast.confidenceLabel)}>
                  {messages[CONFIDENCE_LABEL[forecast.confidenceLabel]]}
                </TableCell>
                <TableCell className="text-right font-medium text-(--color-accent)">
                  {messages.units(forecast.points[0]?.operationalValue ?? 0)}
                </TableCell>
              </TableRow>
            ))}
            {demandForecasts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="px-4 py-8 text-center whitespace-normal text-(--color-text-secondary)">
                  {messages.noDemand}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SurfaceCard>

      <section className="mt-8">
        <div className="mb-4 flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-(--color-accent)">
            <Boxes size={16} />
          </span>
          <div>
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">{messages.stockAnalysis}</h2>
            <p className="text-[12px] text-(--color-text-secondary)">{messages.stockAnalysisDescription}</p>
          </div>
        </div>
        {(unitTurnover === null || stockoutRate === null) && (
          <div className="mb-4 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-[12px] leading-relaxed text-(--color-text-secondary)">
            {messages.stockAnalysisNote}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label={messages.turnover}
            value={unitTurnover === null
              ? "—"
              : `${decimal(unitTurnover, 2, locale)}x`}
            status={unitTurnover === null
              ? messages.noData
              : unitTurnover < 0.5 ? messages.veryLowTurnover : unitTurnover < 1 ? messages.lowTurnover : messages.healthyTurnover}
            description={unitTurnover === null
              ? messages.noTurnover
              : messages.turnoverObserved(decimal(unitTurnover, 2, locale))}
            reference={messages.turnoverReference}
            percent={null}
            tone={unitTurnoverTone}
            icon={RefreshCw}
          />
          <MetricCard
            label={messages.coverage}
            value={coverageDays === null
              ? "—"
              : messages.days(decimal(coverageDays, 1, locale))}
            status={coverageDays === null
              ? messages.noData
              : coverageDays < 15
                ? messages.shortCoverage
                : coverageDays > 90 ? messages.excessStock : coverageDays > 30 ? messages.highCoverage : messages.healthyCoverage}
            description={coverageDays === null
              ? messages.noCoverage
              : messages.coverageEstimate(decimal(coverageDays, 1, locale))}
            reference={messages.coverageReference}
            percent={null}
            tone={coverageTone}
            icon={Boxes}
          />
          <MetricCard
            label={messages.stockoutRate}
            value={formatPercentage(stockoutRate, locale, 1)}
            status={stockoutRate === null
              ? messages.noData
              : stockoutRate === 0 ? messages.noStockouts : stockoutRate <= 0.05 ? messages.occasionalStockouts : messages.urgentAttention}
            description={stockoutRate === null
              ? messages.noStockoutData
              : messages.stockoutObserved(formatPercentage(stockoutRate, locale, 1))}
            reference={messages.stockoutReference}
            percent={stockoutRate === null ? null : stockoutRate * 100}
            tone={stockoutTone}
            icon={TriangleAlert}
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-(--color-accent)">
            <Wrench size={16} />
          </span>
          <div>
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">{messages.productionAnalysis}</h2>
            <p className="text-[12px] text-(--color-text-secondary)">{messages.productionAnalysisDescription}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label={messages.delayRate}
            value={formatPercentage(delayRate, locale)}
            status={delayRate === null
              ? messages.noData
              : delayRate <= 0.05 ? messages.withinTarget : delayRate <= 0.1 ? messages.attention : messages.aboveTarget}
            description={delayRate === null
              ? messages.noCompletedOrders
              : messages.delayObserved(formatPercentage(delayRate, locale))}
            reference={messages.delayReference}
            percent={delayRate === null ? null : delayRate * 100}
            tone={delayTone}
            icon={CalendarDays}
          />
          <MetricCard
            label={messages.averageLeadTime}
            value={cycleTimeHours === null
              ? "—"
              : messages.days(decimal(cycleTimeHours / 24, 1, locale))}
            status={cycleTimeHours === null ? messages.noData : messages.observedCycle}
            description={cycleTimeHours === null
              ? messages.noCycle
              : messages.cycleObserved(decimal(cycleTimeHours, 1, locale))}
            reference={messages.cycleReference}
            percent={null}
            tone="accent"
            icon={Wrench}
          />
          <MetricCard
            label={messages.orderCompletion}
            value={formatPercentage(completionRate, locale)}
            status={completionRate === null
              ? messages.noData
              : completionRate < 0.5 ? messages.lowCompletion : completionRate < 0.8 ? messages.improvingCompletion : messages.healthyCompletion}
            description={messages.completedObserved(dashboard?.serviceOrders.completedCount ?? 0, dashboard?.serviceOrders.createdCount ?? 0)}
            reference={messages.completionReference}
            percent={completionRate === null ? null : completionRate * 100}
            tone={completionTone}
            icon={Check}
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-(--color-accent)">
            <UsersRound size={16} />
          </span>
          <div>
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">{messages.customerAnalysis}</h2>
            <p className="text-[12px] text-(--color-text-secondary)">{messages.customerAnalysisDescription}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label={messages.averageSale}
            value={averageTicketCents === null
              ? "—"
              : formatCurrency(averageTicketCents / 100)}
            status={messages.perCompletedSale}
            description={messages.salesObserved(dashboard?.sales.completedSaleCount ?? 0)}
            reference={messages.averageSaleReference}
            percent={null}
            tone="accent"
            icon={DollarSign}
          />
          <MetricCard
            label={messages.purchaseFrequency}
            value={purchaseFrequency === null
              ? "—"
              : `${decimal(purchaseFrequency, 1, locale)}x`}
            status={purchaseFrequency === null ? messages.noData : messages.purchasesPerCustomer}
            description={messages.customersObserved(dashboard?.customers.activeCustomerCount ?? 0)}
            reference={messages.frequencyReference}
            percent={null}
            tone="accent"
            icon={ShoppingCart}
          />
          <MetricCard
            label={messages.repeatCustomers}
            value={formatPercentage(repeatCustomerRate, locale)}
            status={repeatCustomerRate === null
              ? messages.noData
              : repeatCustomerRate >= 0.8 ? messages.highRecurrence : repeatCustomerRate >= 0.5 ? messages.moderateRecurrence : messages.lowRecurrence}
            description={messages.repeatObserved(dashboard?.customers.repeatCustomerCount ?? 0, dashboard?.customers.activeCustomerCount ?? 0)}
            reference={messages.repeatReference}
            percent={repeatCustomerRate === null ? null : repeatCustomerRate * 100}
            tone={recurrenceTone}
            icon={UsersRound}
          />
        </div>
      </section>

      <p className="mt-6 text-right text-[10px] text-(--color-text-secondary)">
        {messages.updatedAt(dashboard?.dataFreshnessAt
          ? new Date(dashboard.dataFreshnessAt).toLocaleString("pt-BR")
          : "—")}
      </p>
    </div>
  )
}
