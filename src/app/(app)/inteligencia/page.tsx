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
import { RevenueForecastChart, type ForecastPoint } from "@/components/analytics/RevenueForecastChart"
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

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
]

const KPI_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)"
const KPI_VALUE =
  "mt-4 text-[28px] font-semibold leading-none tracking-[-0.56px] text-(--color-text-primary) font-(family-name:--font-data)"

const CONFIDENCE_LABEL: Record<ForecastRun["confidenceLabel"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  unavailable: "Indisponível",
}

const FORECAST_STATUS: Record<ForecastRun["status"], string> = {
  completed: "Previsão concluída",
  insufficient_data: "Dados insuficientes",
  poor_data_quality: "Qualidade de dados insuficiente",
  baseline_not_beaten: "Sem ganho sobre a referência",
}

const FORECAST_METHOD: Record<ForecastRun["method"], string> = {
  ols_trend: "Tendência linear",
  seasonal_ols: "Tendência com sazonalidade",
  naive_last_value: "Último valor observado",
  unavailable: "Indisponível",
}

const STATE_LABEL: Record<Recommendation["state"], string> = {
  pending: "Aguardando revisão",
  accepted: "Aplicada",
  rejected: "Rejeitada",
}

const INSIGHT_LABEL: Record<AiInsight["type"], string> = {
  summary: "Resumo executivo",
  strength: "Ponto forte",
  risk: "Ponto de atenção",
  recommendation: "Recomendação",
}
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
    <div className={cn("rounded-xl border border-(--color-border) bg-(--color-surface)", className)}>
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
  return (
    <div className="inline-flex rounded-lg border border-(--color-border) bg-(--color-surface) p-0.5">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === option.value
              ? "bg-(--color-surface-raised) text-(--color-text-primary)"
              : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
          )}
        >
          {option.label}
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

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "")
}

function formatPercentage(value: number | null, digits = 0) {
  if (value === null) return "—"
  return `${(value * 100).toFixed(digits).replace(".", ",")}%`
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

function recommendationValue(recommendation: Recommendation) {
  const value = objectValue(recommendation.proposedValue)
  if (recommendation.type === "replenishment") {
    const quantity = typeof value.quantity === "number" ? value.quantity : null
    return quantity === null ? "Quantidade pendente de cálculo." : `Repor ${quantity} unidades.`
  }
  if (recommendation.type === "promotion") {
    const rate = typeof value.discountRate === "number" ? value.discountRate : null
    const price = typeof value.suggestedPriceCents === "number"
      ? formatCurrency(value.suggestedPriceCents / 100)
      : null
    if (rate !== null && price) {
      return `Aplicar desconto de ${(rate * 100).toFixed(0)}%, com preço sugerido de ${price}.`
    }
    return "Revisar a condição promocional sugerida."
  }
  return "Revisar manualmente o nível de estoque e o giro deste produto."
}

function numericValue(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "number" ? value[key] : null
}

function recommendationEvidence(recommendation: Recommendation) {
  const evidence = objectValue(recommendation.evidenceMetrics)
  if (recommendation.type === "replenishment") {
    const replenishment = objectValue(evidence.replenishment)
    const dailyDemand = numericValue(replenishment, "meanDailyDemand")
    const daysOfCover = numericValue(replenishment, "daysOfCover")
    const stockoutProbability = numericValue(replenishment, "stockoutProbability")
    const urgent = (stockoutProbability ?? 0) >= 0.5
      || (daysOfCover !== null && daysOfCover <= (numericValue(replenishment, "leadTimeDays") ?? 0))
    return {
      badge: urgent ? "Urgente" : "Repor",
      badgeClass: urgent
        ? "bg-(--color-danger)/15 text-(--color-danger)"
        : "bg-(--color-warning)/15 text-(--color-warning)",
      detail: [
        dailyDemand === null ? null : `Demanda média de ${dailyDemand.toFixed(1).replace(".", ",")} un./dia`,
        daysOfCover === null ? null : `${daysOfCover.toFixed(1).replace(".", ",")} dias de cobertura`,
        stockoutProbability === null
          ? null
          : `${(stockoutProbability * 100).toFixed(0)}% de risco de ruptura no horizonte`,
      ].filter(Boolean).join(" · "),
    }
  }

  const promotion = objectValue(evidence.promotion)
  const turnover = numericValue(evidence, "unitTurnover")
  const excessUnits = numericValue(promotion, "excessUnits")
  return {
    badge: recommendation.type === "promotion" ? "Baixo giro" : "Revisar",
    badgeClass: "bg-(--color-warning)/15 text-(--color-warning)",
    detail: [
      turnover === null ? null : `Giro de ${turnover.toFixed(2).replace(".", ",")}x no período`,
      excessUnits === null ? null : `${excessUnits.toFixed(0)} un. acima do estoque-alvo`,
    ].filter(Boolean).join(" · "),
  }
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
        <p className="mt-auto text-[11px] text-(--color-text-secondary)">Sem série histórica no período.</p>
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
        <span className={KPI_LABEL}>Ordens de Serviço</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-(--color-info)/15 text-(--color-info)">
          <Wrench size={16} />
        </span>
      </div>
      <p className={KPI_VALUE}>{total}</p>
      <p className="mt-2 mb-5 text-[12px] font-medium text-(--color-text-secondary)">
        {dashboard?.serviceOrders.openCount ?? 0} em aberto · {dashboard?.serviceOrders.overdueOpenCount ?? 0} atrasadas
      </p>
      <div className="mt-auto flex items-center gap-4">
        <div
          className="size-20 shrink-0 rounded-full"
          style={{ background: total === 0 ? "var(--color-surface-raised)" : `conic-gradient(${gradient})` }}
          aria-label={`Distribuição de ${total} ordens por etapa`}
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
            <p className="text-[11px] text-(--color-text-secondary)">Nenhuma ordem cadastrada.</p>
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
  const [reviewing, setReviewing] = useState(false)

  if (recommendation.state !== "pending") {
    return (
      <span className={cn(
        "rounded-md px-2 py-1 text-[10px] font-semibold uppercase",
        recommendation.state === "accepted"
          ? "bg-(--color-success)/15 text-(--color-success)"
          : "bg-(--color-danger)/15 text-(--color-danger)"
      )}>
        {recommendation.state === "accepted" && recommendation.type === "overstock_review"
          ? "Revisada"
          : STATE_LABEL[recommendation.state]}
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
        aria-label={`Rejeitar recomendação para ${recommendation.product.name}`}
        onClick={() => void review("rejected")}
      >
        <X size={14} />
      </Button>
      <Button
        size="sm"
        disabled={reviewing}
        aria-label={`${recommendation.type === "overstock_review" ? "Revisar" : "Aplicar"} recomendação para ${recommendation.product.name}`}
        onClick={() => void review("accepted")}
      >
        {reviewing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        {recommendation.type === "overstock_review" ? "Revisar" : "Aplicar"}
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
  if (items.length === 0) {
    return <p className="text-[12px] text-(--color-text-secondary)">{emptyMessage}</p>
  }

  return (
    <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
      {items.map((recommendation) => (
        <div
          key={recommendation.id}
          className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-[14px] font-semibold text-(--color-text-primary)">
                  {recommendation.product.name}
                </p>
                <span className={cn(
                  "rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase",
                  recommendationEvidence(recommendation).badgeClass
                )}>
                  {recommendationEvidence(recommendation).badge}
                </span>
              </div>
              {recommendationEvidence(recommendation).detail && (
                <p className="mt-1 text-[11px] leading-relaxed text-(--color-text-secondary)">
                  {recommendationEvidence(recommendation).detail}
                </p>
              )}
              <p className="mt-1 text-[12px] leading-relaxed text-(--color-text-secondary)">
                {recommendationValue(recommendation)}
              </p>
              <p className="mt-2 text-[11px] text-(--color-text-secondary)">
                Confiança: {CONFIDENCE_LABEL[recommendation.confidenceLabel]}
              </p>
            </div>
            <RecommendationActions recommendation={recommendation} onReview={onReview} />
          </div>
        </div>
      ))}
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
        <div className="flex items-center gap-2.5">
          <span className={cn("flex size-9 items-center justify-center rounded-lg", style.icon)}>
            <Icon size={17} />
          </span>
          <span className={KPI_LABEL}>{label}</span>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
          style.badge
        )}>
          <span className="size-1.5 rounded-full" style={{ backgroundColor: style.color }} />
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
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-(--color-border) bg-(--color-surface-raised) px-5 py-3.5">
        <CardTitle>{title}</CardTitle>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-(--color-border) hover:bg-transparent">
            <TableHead>Item</TableHead>
            <TableHead>Cód. barras</TableHead>
            <TableHead className="text-right">Vendas</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.productId} className="border-(--color-border)">
              <TableCell className="font-medium text-(--color-text-primary)">{item.name}</TableCell>
              <TableCell className="text-(--color-text-secondary)">{item.barcode ?? "—"}</TableCell>
              <TableCell className="text-right">{item.unitsSold} un.</TableCell>
              <TableCell className="text-right font-medium text-(--color-success)">
                {formatCurrency(item.netRevenueCents / 100)}
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-(--color-text-secondary)">
                Nenhuma venda no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </SurfaceCard>
  )
}

export default function InteligenciaPage() {
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
      await loadDashboard(currentRange(period))
      await loadIntelligence()
    } catch {
      toast.error("Não foi possível carregar os dados de inteligência.")
    } finally {
      setRunning(null)
    }
  }

  useEffect(() => {
    void Promise.all([
      loadDashboard(currentRange(period)),
      loadIntelligence(),
      loadOrders(),
    ])
      .catch(() => toast.error("Não foi possível carregar os dados de inteligência."))
  }, [loadDashboard, loadIntelligence, loadOrders, period])

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
    } catch {
      toast.error("Não foi possível iniciar o processamento.")
    } finally {
      setRunning(null)
    }
  }

  async function generateReport() {
    if (insightAvailability === "unavailable") {
      toast.error("O provedor de IA ainda não está configurado.")
      return
    }
    await execute("insight", runInsights, "A geração do relatório foi solicitada.")
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
          ? "Revisão registrada com sucesso."
          : "Recomendação aplicada com sucesso."
        : "Recomendação rejeitada.")
    } catch {
      toast.error(decision === "accepted"
        ? isManualReview
          ? "Não foi possível registrar a revisão."
          : "Não foi possível aplicar a recomendação."
        : "Não foi possível rejeitar a recomendação.")
    }
  }

  const revenuePoints = trendDashboard?.revenueSeries.map((point, index, series) => ({
    label: monthLabel(point.bucketStart),
    value: point.netRevenueCents / 100,
    display: formatCurrency(point.netRevenueCents / 100),
    highlight: index === series.length - 1,
  })) ?? []
  const salesPoints = trendDashboard?.revenueSeries.map((point, index, series) => ({
    label: monthLabel(point.bucketStart),
    value: point.completedSaleCount,
    display: `${point.completedSaleCount} vendas`,
    highlight: index === series.length - 1,
  })) ?? []
  const inventoryPoints = trendDashboard?.inventorySeries.map((point, index, series) => ({
    label: monthLabel(point.bucketStart),
    value: point.soldOutCount + point.lowStockCount,
    display: `${point.soldOutCount + point.lowStockCount} itens`,
    highlight: index === series.length - 1,
  })) ?? []

  const revenueForecast = forecasts.find((forecast) => forecast.targetType === "monthly_revenue")
  const demandForecasts = forecasts.filter((forecast) => forecast.targetType === "product_demand")

  const forecastChart = useMemo<ForecastPoint[]>(() => {
    const points = new Map<string, ForecastPoint>()
    const realizedHistory = (trendDashboard?.revenueSeries ?? dashboard?.revenueSeries ?? [])
      .slice(-3)
    for (const point of realizedHistory) {
      points.set(point.bucketStart.slice(0, 7), {
        label: monthLabel(point.bucketStart),
        realized: point.netRevenueCents / 100,
        projected: null,
      })
    }
    for (const point of revenueForecast?.points ?? []) {
      const key = point.bucketStart.slice(0, 7)
      const current = points.get(key)
      points.set(key, {
        label: monthLabel(point.bucketStart),
        realized: current?.realized ?? null,
        projected: point.operationalValue / 100,
      })
    }
    return [...points.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, point]) => point)
  }, [dashboard?.revenueSeries, revenueForecast, trendDashboard?.revenueSeries])

  const visibleInsights = insights.filter((insight) => insight.state !== "rejected")
  const insightGroups = INSIGHT_TYPES.map((type) => ({
    type,
    items: visibleInsights.filter((insight) => insight.type === type),
  })).filter((group) => group.items.length > 0)
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
    (point) => point.seasonalFactor !== null
  ) ?? []
  const criticalStock = (dashboard?.inventory.lowStockCount ?? 0)
    + (dashboard?.inventory.soldOutCount ?? 0)
  const cashDifference = (dashboard?.cash.closingDifferenceCents ?? 0) / 100
  const rankedItems = (dashboard?.topProducts.data ?? []).filter((item) => (
    rankingType === "service" ? item.type === "service" : item.type !== "service"
  ))
  const highestSales = [...rankedItems].sort((left, right) => (
    right.netRevenueCents - left.netRevenueCents || right.unitsSold - left.unitsSold
  ))
  const lowestSales = [...rankedItems].sort((left, right) => (
    left.netRevenueCents - right.netRevenueCents || left.unitsSold - right.unitsSold
  ))
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
        title="Inteligência"
        subtitle="Painel estratégico de performance de vendas, estoque e produção"
      />

      <SurfaceCard className="mb-6 overflow-hidden">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-4 bg-(--color-surface-raised) px-5 py-3.5",
            reportVisible && "border-b border-(--color-border)"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-(--color-accent)">
              <Sparkles size={16} />
            </span>
            <div>
              <CardTitle>Relatório de IA</CardTitle>
              <p className="text-[11px] text-(--color-text-secondary)">
                Explicações persistidas a partir das evidências matemáticas do período
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={period} onChange={setPeriod} />
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
                  ? "Processando relatório"
                  : visibleInsights.length > 0
                    ? "Ver Relatório de IA"
                    : "Gerar Relatório de IA"}
              </Button>
            ) : (
              <>
                <Button
                  className="gap-2"
                  disabled={running !== null || insightProcessing || insightAvailability === "unavailable"}
                  onClick={() => void generateReport()}
                >
                  {running === "insight" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Regenerar
                </Button>
                <button
                  type="button"
                  aria-label="Fechar relatório"
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
          <div className="p-5">
            {visibleInsights.length === 0 ? (
              <div className="flex items-center gap-2 text-[13px] text-(--color-text-secondary)">
                {insightProcessing && <Loader2 size={15} className="animate-spin" />}
                <p>
                  {insightProcessing
                    ? "O relatório está sendo processado e aparecerá automaticamente."
                    : insightRunStatus === "rejected"
                      ? "A resposta da IA não passou pela validação de evidências. Gere um novo relatório."
                      : insightRunStatus === "failed"
                        ? "A geração do relatório falhou. Tente novamente."
                        : insightRunStatus === "budget_exceeded"
                          ? "O limite de uso da IA foi atingido."
                          : "Nenhum relatório foi gerado ainda."}
                </p>
              </div>
            ) : (
              <div className="flex max-w-4xl flex-col gap-5">
                {insightGroups.map((group) => (
                  <div key={group.type}>
                    <div className="mb-1.5 flex items-center gap-3">
                      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-(--color-text-primary)">
                        {group.type === "risk"
                          ? <TriangleAlert size={14} className="text-(--color-warning)" />
                          : group.type === "recommendation"
                            ? <Lightbulb size={14} className="text-(--color-accent)" />
                            : group.type === "summary"
                              ? <FileText size={14} className="text-(--color-accent)" />
                              : <TrendingUp size={14} className="text-(--color-success)" />}
                        {INSIGHT_LABEL[group.type]}
                      </h3>
                    </div>
                    {group.items.length > 1 ? (
                      <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-(--color-text-secondary)">
                        {group.items.map((insight) => (
                          <li key={insight.id}>{insight.text}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[13px] leading-relaxed text-(--color-text-secondary)">
                        {group.items[0]?.text}
                      </p>
                    )}
                  </div>
                ))}
                <p className="border-t border-(--color-border) pt-3 text-[11px] text-(--color-text-secondary)">
                  Conteúdo explicativo. As recomendações precisam de revisão humana antes de qualquer ação.
                </p>
              </div>
            )}
          </div>
        )}
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiLineCard
          label={period === "monthly" ? "Faturamento do Mês" : "Faturamento do Trimestre"}
          value={formatCurrency((dashboard?.sales.netRevenueCents ?? 0) / 100)}
          hint="faturamento líquido realizado"
          hintClass="text-(--color-success)"
          icon={DollarSign}
          iconClass="bg-(--color-success)/15 text-(--color-success)"
          points={revenuePoints}
        />
        <KpiLineCard
          label="Vendas Realizadas"
          value={String(dashboard?.sales.completedSaleCount ?? 0)}
          hint={`Ticket médio ${formatCurrency((dashboard?.sales.averageTicketCents ?? 0) / 100)}`}
          icon={ShoppingCart}
          iconClass="bg-primary/15 text-(--color-accent)"
          points={salesPoints}
        />
        <KpiLineCard
          label="Estoque Crítico"
          value={String(criticalStock)}
          hint={`${dashboard?.inventory.soldOutCount ?? 0} esgotados · ${dashboard?.inventory.lowStockCount ?? 0} em nível baixo`}
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
          <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Análise de Caixa</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CashCard
            label="Caixas Abertos"
            value={String(dashboard?.cash.openedSessionCount ?? 0)}
            hint="sessões abertas no período"
            icon={Wallet}
            iconClass="bg-primary/15 text-(--color-accent)"
          />
          <CashCard
            label="Caixas Fechados"
            value={String(dashboard?.cash.closedSessionCount ?? 0)}
            hint="sessões conferidas no período"
            icon={Banknote}
            iconClass="bg-(--color-success)/15 text-(--color-success)"
          />
          <CashCard
            label="Divergência Acumulada"
            value={formatCurrency(cashDifference)}
            hint={cashDifference === 0 ? "Sem divergência registrada" : cashDifference > 0 ? "Sobra acumulada" : "Falta acumulada"}
            icon={TriangleAlert}
            iconClass={cashDifference === 0
              ? "bg-(--color-success)/15 text-(--color-success)"
              : "bg-(--color-warning)/15 text-(--color-warning)"}
          />
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SurfaceCard className="p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-(--color-accent)" />
              <div>
                <CardTitle>Projeção de Faturamento</CardTitle>
                <p className="text-[12px] text-(--color-text-secondary)">
                  Valores realizados e previsão persistida para os próximos meses
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={running !== null}
              onClick={() => void execute("forecast", runForecasts, "A geração das previsões foi solicitada.")}
            >
              {running === "forecast" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Atualizar previsão
            </Button>
          </div>
          {forecastChart.length > 0 ? (
            <RevenueForecastChart data={forecastChart} />
          ) : (
            <p className="py-12 text-center text-[13px] text-(--color-text-secondary)">
              Nenhuma previsão de faturamento publicada.
            </p>
          )}
        </SurfaceCard>

        <div className="flex flex-col gap-4">
          <SurfaceCard className="p-5">
            <CardTitle>Qualidade da Previsão</CardTitle>
            <p className="mb-4 text-[12px] text-(--color-text-secondary)">
              Método e confiança do cálculo atual
            </p>
            {revenueForecast ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3">
                  <p className="text-[11px] text-(--color-text-secondary)">Método selecionado</p>
                  <p className="mt-1 text-[13px] font-semibold text-(--color-text-primary)">
                    {FORECAST_METHOD[revenueForecast.method]}
                  </p>
                </div>
                <div className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3">
                  <p className="text-[11px] text-(--color-text-secondary)">Confiança</p>
                  <p className={cn("mt-1 text-[13px] font-semibold", confidenceTone(revenueForecast.confidenceLabel))}>
                    {CONFIDENCE_LABEL[revenueForecast.confidenceLabel]}
                    {revenueForecast.confidenceScore !== null ? ` · ${revenueForecast.confidenceScore.toFixed(0)}%` : ""}
                  </p>
                </div>
                <p className="text-[11px] text-(--color-text-secondary)">
                  {FORECAST_STATUS[revenueForecast.status]}
                </p>
              </div>
            ) : (
              <p className="text-[12px] text-(--color-text-secondary)">Nenhum cálculo publicado.</p>
            )}
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays size={16} className="text-(--color-accent)" />
              <CardTitle>Sazonalidades Identificadas</CardTitle>
            </div>
            <p className="mb-4 text-[12px] text-(--color-text-secondary)">
              Fatores matemáticos aplicados à curva preditiva
            </p>
            <div className="space-y-2">
              {seasonalPoints.map((point) => (
                <div
                  key={point.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-raised) px-3 py-2"
                >
                  <span className="capitalize text-[12px] font-medium text-(--color-text-primary)">
                    {monthLabel(point.bucketStart)}
                  </span>
                  <span className={cn(
                    "text-[12px] font-semibold",
                    (point.seasonalFactor ?? 1) >= 1 ? "text-(--color-success)" : "text-(--color-warning)"
                  )}>
                    {((point.seasonalFactor ?? 1) - 1) >= 0 ? "+" : ""}
                    {(((point.seasonalFactor ?? 1) - 1) * 100).toFixed(1).replace(".", ",")}%
                  </span>
                </div>
              ))}
              {seasonalPoints.length === 0 && (
                <p className="text-[12px] text-(--color-text-secondary)">
                  O método atual não identificou fator sazonal publicável.
                </p>
              )}
            </div>
          </SurfaceCard>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SurfaceCard className="p-5 lg:h-[520px]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <CardTitle>Promoções Estruturadas</CardTitle>
              <p className="text-[12px] text-(--color-text-secondary)">Sugestões matemáticas para itens de baixo giro</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Atualizar recomendações"
              disabled={running !== null}
              onClick={() => void execute("recommendation", runRecommendations, "A geração das recomendações foi solicitada.")}
            >
              {running === "recommendation" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </Button>
          </div>
          <RecommendationList
            items={promotionRecommendations}
            emptyMessage="Nenhuma promoção sugerida para o período."
            onReview={handleRecommendationReview}
          />
        </SurfaceCard>

        <SurfaceCard className="p-5 lg:h-[520px]">
          <div className="mb-4">
            <CardTitle>Sugestões de Reposição</CardTitle>
            <p className="text-[12px] text-(--color-text-secondary)">Itens com necessidade calculada de abastecimento</p>
          </div>
          <RecommendationList
            items={replenishmentRecommendations}
            emptyMessage="Nenhuma reposição sugerida para o período."
            onReview={handleRecommendationReview}
          />
        </SurfaceCard>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Ranking de Vendas</h2>
          <p className="text-[12px] text-(--color-text-secondary)">Maiores e menores faturamentos realizados no período</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-(--color-border) bg-(--color-surface) p-0.5">
            {([
              { value: "product" as const, label: "Produto" },
              { value: "service" as const, label: "Serviço" },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
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
            Atualizar
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SalesRankingTable
          title={`Maiores Vendas de ${rankingType === "service" ? "Serviços" : "Produtos"}`}
          items={highestSales}
        />
        <SalesRankingTable
          title={`Menores Vendas de ${rankingType === "service" ? "Serviços" : "Produtos"}`}
          items={lowestSales}
        />
      </div>

      <SurfaceCard className="mt-4 overflow-hidden">
        <div className="border-b border-(--color-border) bg-(--color-surface-raised) px-5 py-3.5">
          <CardTitle>Demanda Prevista por Produto</CardTitle>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-(--color-border) hover:bg-transparent">
              <TableHead>Produto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Confiança</TableHead>
              <TableHead className="text-right">Previsão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demandForecasts.map((forecast) => (
              <TableRow key={forecast.id} className="border-(--color-border)">
                <TableCell className="font-medium text-(--color-text-primary)">
                  {forecast.product?.name ?? "Produto"}
                </TableCell>
                <TableCell className="text-(--color-text-secondary)">
                  {FORECAST_METHOD[forecast.method]}
                </TableCell>
                <TableCell className={confidenceTone(forecast.confidenceLabel)}>
                  {CONFIDENCE_LABEL[forecast.confidenceLabel]}
                </TableCell>
                <TableCell className="text-right font-medium text-(--color-accent)">
                  {forecast.points[0]?.operationalValue ?? 0} un.
                </TableCell>
              </TableRow>
            ))}
            {demandForecasts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-(--color-text-secondary)">
                  Nenhuma previsão de demanda publicada.
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
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Análise de Estoque Avançada</h2>
            <p className="text-[12px] text-(--color-text-secondary)">Eficiência, autonomia e risco do saldo atual</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Giro de Estoque"
            value={unitTurnover === null
              ? "—"
              : `${unitTurnover.toFixed(2).replace(".", ",")}x`}
            status={unitTurnover === null
              ? "Sem dados"
              : unitTurnover < 0.5 ? "Giro muito baixo" : unitTurnover < 1 ? "Giro baixo" : "Bom giro"}
            description={unitTurnover === null
              ? "Ainda não há histórico suficiente para medir a renovação do estoque."
              : `O estoque foi renovado ${unitTurnover.toFixed(2).replace(".", ",")} vez no período analisado.`}
            reference="Quanto maior o giro, menos capital permanece parado em estoque."
            percent={null}
            tone={unitTurnoverTone}
            icon={RefreshCw}
          />
          <MetricCard
            label="Cobertura de Estoque"
            value={coverageDays === null
              ? "—"
              : `${coverageDays.toFixed(1).replace(".", ",")} dias`}
            status={coverageDays === null
              ? "Sem dados"
              : coverageDays < 15
                ? "Cobertura curta"
                : coverageDays > 90 ? "Estoque excessivo" : coverageDays > 30 ? "Cobertura alta" : "Faixa saudável"}
            description={coverageDays === null
              ? "Sem vendas suficientes para estimar por quanto tempo o saldo atual duraria."
              : `No ritmo atual de vendas, o saldo disponível sustentaria aproximadamente ${coverageDays.toFixed(1).replace(".", ",")} dias.`}
            reference="Referência operacional: entre 15 e 30 dias de cobertura."
            percent={null}
            tone={coverageTone}
            icon={Boxes}
          />
          <MetricCard
            label="Taxa de Ruptura"
            value={formatPercentage(stockoutRate, 1)}
            status={stockoutRate === null
              ? "Sem dados"
              : stockoutRate === 0 ? "Sem rupturas" : stockoutRate <= 0.05 ? "Ruptura pontual" : "Atenção urgente"}
            description={stockoutRate === null
              ? "Ainda não há observação suficiente sobre indisponibilidade de produtos."
              : `${formatPercentage(stockoutRate, 1)} do tempo monitorado teve produto sem saldo disponível.`}
            reference="Meta operacional: manter a ruptura abaixo de 5%."
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
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Análise de Produção</h2>
            <p className="text-[12px] text-(--color-text-secondary)">Velocidade e cumprimento dos prazos das ordens</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Índice de Atraso"
            value={formatPercentage(delayRate)}
            status={delayRate === null
              ? "Sem dados"
              : delayRate <= 0.05 ? "Dentro da meta" : delayRate <= 0.1 ? "Ponto de atenção" : "Acima da meta"}
            description={delayRate === null
              ? "Nenhuma ordem concluída com prazo comparável foi encontrada no período."
              : `${formatPercentage(delayRate)} das ordens com prazo foram finalizadas depois da data prevista.`}
            reference="Meta operacional: manter os atrasos abaixo de 10%."
            percent={delayRate === null ? null : delayRate * 100}
            tone={delayTone}
            icon={CalendarDays}
          />
          <MetricCard
            label="Lead Time Médio"
            value={cycleTimeHours === null
              ? "—"
              : `${(cycleTimeHours / 24).toFixed(1).replace(".", ",")} dias`}
            status={cycleTimeHours === null ? "Sem dados" : "Ciclo observado"}
            description={cycleTimeHours === null
              ? "Ainda não há ordens concluídas suficientes para calcular o ciclo médio."
              : `Uma ordem levou, em média, ${cycleTimeHours.toFixed(1).replace(".", ",")} horas da criação até a conclusão.`}
            reference="Quanto menor o tempo, mais rápido o fluxo de produção."
            percent={null}
            tone="accent"
            icon={Wrench}
          />
          <MetricCard
            label="Conclusão de Ordens"
            value={formatPercentage(completionRate)}
            status={completionRate === null
              ? "Sem dados"
              : completionRate < 0.5 ? "Baixa conclusão" : completionRate < 0.8 ? "Em evolução" : "Bom desempenho"}
            description={`${dashboard?.serviceOrders.completedCount ?? 0} de ${dashboard?.serviceOrders.createdCount ?? 0} ordens criadas no período foram concluídas.`}
            reference="Uma taxa maior indica melhor vazão do fluxo de produção."
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
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Análise de Clientes</h2>
            <p className="text-[12px] text-(--color-text-secondary)">Valor e recorrência da base atendida</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Ticket Médio"
            value={averageTicketCents === null
              ? "—"
              : formatCurrency(averageTicketCents / 100)}
            status="Por venda concluída"
            description={`${dashboard?.sales.completedSaleCount ?? 0} vendas concluídas compõem o valor médio apresentado.`}
            reference="O indicador considera o faturamento líquido após descontos e devoluções."
            percent={null}
            tone="accent"
            icon={DollarSign}
          />
          <MetricCard
            label="Frequência de Compra"
            value={purchaseFrequency === null
              ? "—"
              : `${purchaseFrequency.toFixed(1).replace(".", ",")}x`}
            status={purchaseFrequency === null ? "Sem dados" : "Compras por cliente"}
            description={`${dashboard?.customers.activeCustomerCount ?? 0} clientes identificados compraram no período analisado.`}
            reference="Quanto maior a frequência, maior a repetição de compra na base."
            percent={null}
            tone="accent"
            icon={ShoppingCart}
          />
          <MetricCard
            label="Clientes Recorrentes"
            value={formatPercentage(repeatCustomerRate)}
            status={repeatCustomerRate === null
              ? "Sem dados"
              : repeatCustomerRate >= 0.8 ? "Alta recorrência" : repeatCustomerRate >= 0.5 ? "Recorrência moderada" : "Baixa recorrência"}
            description={`${dashboard?.customers.repeatCustomerCount ?? 0} de ${dashboard?.customers.activeCustomerCount ?? 0} clientes identificados compraram duas ou mais vezes.`}
            reference="Referência operacional: recorrência igual ou superior a 80%."
            percent={repeatCustomerRate === null ? null : repeatCustomerRate * 100}
            tone={recurrenceTone}
            icon={UsersRound}
          />
        </div>
      </section>

      <p className="mt-6 text-right text-[10px] text-(--color-text-secondary)">
        Dados atualizados em {dashboard?.dataFreshnessAt
          ? new Date(dashboard.dataFreshnessAt).toLocaleString("pt-BR")
          : "—"}
      </p>
    </div>
  )
}
