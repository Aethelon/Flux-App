"use client"

import { create } from "zustand"
import { api, idempotencyHeaders, idempotentGenerationRetry } from "@/lib/api"

export interface DashboardData {
  dateRange: {
    from: string
    to: string
  }
  dataFreshnessAt: string
  sales: {
    netRevenueCents: number
    completedSaleCount: number
    averageTicketCents: number | null
  }
  revenueSeries: Array<{
    bucketStart: string
    completedSaleCount: number
    netRevenueCents: number
  }>
  serviceOrderSeries: Array<{
    bucketStart: string
    createdCount: number
    completedCount: number
  }>
  topProducts: {
    data: Array<{
      productId: string
      name: string
      barcode: string | null
      type: "raw_material" | "finished_product" | "packaging" | "service"
      unitsSold: number
      netRevenueCents: number
    }>
  }
  inventorySeries: Array<{
    bucketStart: string
    soldOutCount: number
    lowStockCount: number
  }>
  inventory: {
    activeProductCount: number
    soldOutCount: number
    lowStockCount: number
    alerts: Array<{
      productId: string
      name: string
      status: "sold_out" | "low_stock"
    }>
    inventoryValueCents: number | null
    unitTurnover: number | null
    coverageDays: number | null
    stockoutRate: number | null
  }
  customers: {
    activeCustomerCount: number
    repeatCustomerCount: number
    purchaseFrequency: number | null
    repeatCustomerRate: number | null
  }
  serviceOrders: {
    createdCount: number
    completedCount: number
    openCount: number
    overdueOpenCount: number
    completionRate: number | null
    averageCycleTimeHours: number | null
    onTimeRate: number | null
  }
  cash: {
    openedSessionCount: number
    closedSessionCount: number
    closingDifferenceCents: number
  }
}

export interface ForecastRun {
  id: string
  targetType: "product_demand" | "monthly_revenue"
  product: { id: string; name: string } | null
  method: "ols_trend" | "seasonal_ols" | "damped_trend" | "naive_last_value" | "unavailable"
  calculationVersion: string
  trainingFrom: string
  trainingTo: string
  bucketCount: number
  eligibleBucketCount: number
  confidenceScore: number | null
  confidenceLabel: "low" | "medium" | "high" | "unavailable"
  status: "completed" | "insufficient_data" | "poor_data_quality" | "baseline_not_beaten"
  limitations: unknown
  createdAt: string
  points: Array<{
    id: string
    bucketStart: string
    operationalValue: number
    lowerLimit: number | null
    upperLimit: number | null
    seasonalFactor: number | null
    calendarEvents: Array<{
      name: string
      kind: "season" | "retail" | "holiday" | "custom"
      source: string
      startsOn: string
      endsOn: string
    }>
  }>
}

interface DashboardQuery {
  from?: string
  to?: string
  bucket?: "day" | "week" | "month"
  topBy?: "units" | "net_revenue"
  topLimit?: number
}

export interface Recommendation {
  id: string
  type: "replenishment" | "promotion" | "overstock_review"
  product: { id: string; name: string }
  proposedValue: unknown
  evidenceMetrics: unknown
  confidenceScore: number | null
  confidenceLabel: "low" | "medium" | "high" | "unavailable"
  state: "pending" | "accepted" | "rejected"
  createdAt: string
}

export interface AiInsight {
  id: string
  runId: string
  reportPeriod: "monthly" | "quarterly"
  type: "summary" | "strength" | "risk" | "recommendation"
  text: string
  severity: "low" | "medium" | "high" | null
  state: "pending" | "accepted" | "rejected"
  provider: "gemini" | "anthropic"
  modelId: string
  createdAt: string
}

export type AiRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "cached"
  | "rejected"
  | "failed"
  | "budget_exceeded"

interface AnalyticsStore {
  dashboard: DashboardData | null
  trendDashboard: DashboardData | null
  forecasts: ForecastRun[]
  recommendations: Recommendation[]
  insights: AiInsight[]
  insightAvailability: "available" | "unavailable"
  insightRunStatus: AiRunStatus | null
  loadDashboard: (query?: DashboardQuery, includeRecommendations?: boolean) => Promise<void>
  loadIntelligence: () => Promise<void>
  runForecasts: () => Promise<void>
  runRecommendations: () => Promise<void>
  runInsights: () => Promise<void>
  reviewRecommendation: (id: string, decision: "accepted" | "rejected") => Promise<void>
  reviewInsight: (id: string, decision: "accepted" | "rejected") => Promise<void>
}

const dashboardLoadPromises = new Map<string, Promise<void>>()

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  dashboard: null,
  trendDashboard: null,
  forecasts: [],
  recommendations: [],
  insights: [],
  insightAvailability: "available",
  insightRunStatus: null,
  loadDashboard: (query, includeRecommendations = true) => {
    const loadKey = JSON.stringify({ query: query ?? null, includeRecommendations })
    const currentLoad = dashboardLoadPromises.get(loadKey)
    if (currentLoad) return currentLoad

    const load = (async () => {
      const trendTo = query?.to ? new Date(query.to) : new Date()
      const trendFrom = new Date(trendTo.getFullYear(), trendTo.getMonth() - 5, 1)
      const dashboard = await api.get("dashboard", {
        searchParams: {
          bucket: query?.bucket ?? "month",
          topBy: query?.topBy ?? "net_revenue",
          topLimit: query?.topLimit ?? 5,
          ...(query?.from ? { from: query.from } : {}),
          ...(query?.to ? { to: query.to } : {}),
        },
      }).json<DashboardData>()
      set({ dashboard })

      const [trendDashboard, recommendations] = await Promise.all([
        api.get("dashboard", {
          searchParams: {
            bucket: "month",
            topBy: query?.topBy ?? "net_revenue",
            topLimit: query?.topLimit ?? 5,
            from: trendFrom.toISOString(),
            to: trendTo.toISOString(),
          },
        }).json<DashboardData>(),
        includeRecommendations
          ? api.get("intelligence/recommendations", {
              searchParams: {
                limit: 5,
                type: "replenishment",
                state: "pending",
              },
            }).json<{ data: Recommendation[] }>().catch(() => ({
              data: [] as Recommendation[],
            }))
          : Promise.resolve({ data: [] as Recommendation[] }),
      ])
      set({
        trendDashboard,
        ...(includeRecommendations ? { recommendations: recommendations.data } : {}),
      })
    })()

    const trackedLoad = load.finally(() => {
      dashboardLoadPromises.delete(loadKey)
    })
    dashboardLoadPromises.set(loadKey, trackedLoad)
    return trackedLoad
  },
  loadIntelligence: async () => {
    const [forecasts, recommendations, insights] = await Promise.all([
      api.get("intelligence/forecasts", {
        searchParams: { limit: 50, publishedOnly: true },
      }).json<{ data: ForecastRun[] }>(),
      api.get("intelligence/recommendations", {
        searchParams: { limit: 50 },
      }).json<{ data: Recommendation[] }>(),
      api.get("intelligence/insights", {
        searchParams: { limit: 50 },
      }).json<{
        data: AiInsight[]
        availability: "available" | "unavailable"
        latestRunStatus: AiRunStatus | null
      }>(),
    ])
    const latestRunByPeriod = new Map<AiInsight["reportPeriod"], string>()
    for (const insight of insights.data) {
      if (!latestRunByPeriod.has(insight.reportPeriod)) {
        latestRunByPeriod.set(insight.reportPeriod, insight.runId)
      }
    }
    const reportInsights = insights.data.filter((item) => (
      latestRunByPeriod.get(item.reportPeriod) === item.runId
    ))
    const reportOrder: Record<AiInsight["type"], number> = {
      summary: 0,
      strength: 1,
      risk: 2,
      recommendation: 3,
    }
    set({
      forecasts: forecasts.data,
      recommendations: recommendations.data,
      insights: reportInsights.sort((left, right) =>
        left.reportPeriod.localeCompare(right.reportPeriod)
          || reportOrder[left.type] - reportOrder[right.type]
      ),
      insightAvailability: insights.availability,
      insightRunStatus: insights.latestRunStatus,
    })
  },
  runForecasts: async () => {
    await api.post("intelligence/forecasts/runs", {
      headers: idempotencyHeaders(),
      json: { includeRevenue: true, includeProducts: true },
      retry: idempotentGenerationRetry,
    })
    await get().loadIntelligence()
  },
  runRecommendations: async () => {
    await api.post("intelligence/recommendations/runs", {
      headers: idempotencyHeaders(),
      retry: idempotentGenerationRetry,
    })
    await get().loadIntelligence()
  },
  runInsights: async () => {
    for (const period of ["monthly", "quarterly"] as const) {
      await api.post("intelligence/insights/runs", {
        headers: idempotencyHeaders(),
        json: { period },
        retry: idempotentGenerationRetry,
      })
    }
    await get().loadIntelligence()
  },
  reviewRecommendation: async (id, decision) => {
    const reviewed = await api.post(`intelligence/recommendations/${id}/review`, {
      headers: idempotencyHeaders(),
      json: {
        decision,
        reason: decision === "accepted"
          ? "Applied through the intelligence dashboard."
          : "Rejected through the intelligence dashboard.",
      },
    }).json<Recommendation>()
    set((state) => ({
      recommendations: state.recommendations.map((item) =>
        item.id === reviewed.id ? reviewed : item
      ),
    }))
    await get().loadIntelligence().catch(() => undefined)
  },
  reviewInsight: async (id, decision) => {
    await api.post(`intelligence/insights/${id}/review`, {
      headers: idempotencyHeaders(),
      json: {
        decision,
        reason: "Reviewed through the intelligence dashboard.",
      },
    })
    await get().loadIntelligence()
  },
}))
