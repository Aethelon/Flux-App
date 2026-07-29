"use client"

import { create } from "zustand"
import { api, idempotencyHeaders } from "@/lib/api"

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
  method: string
  calculationVersion: string
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
  type: "summary" | "strength" | "risk" | "recommendation"
  text: string
  severity: "low" | "medium" | "high" | null
  state: "pending" | "accepted" | "rejected"
  provider: "gemini" | "anthropic"
  modelId: string
  createdAt: string
}

interface AnalyticsStore {
  dashboard: DashboardData | null
  trendDashboard: DashboardData | null
  forecasts: ForecastRun[]
  recommendations: Recommendation[]
  insights: AiInsight[]
  insightAvailability: "available" | "unavailable"
  loadDashboard: (query?: DashboardQuery) => Promise<void>
  loadIntelligence: () => Promise<void>
  runForecasts: () => Promise<void>
  runRecommendations: () => Promise<void>
  runInsights: () => Promise<void>
  reviewRecommendation: (id: string, decision: "accepted" | "rejected") => Promise<void>
  reviewInsight: (id: string, decision: "accepted" | "rejected") => Promise<void>
}

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  dashboard: null,
  trendDashboard: null,
  forecasts: [],
  recommendations: [],
  insights: [],
  insightAvailability: "available",
  loadDashboard: async (query) => {
    const trendTo = query?.to ? new Date(query.to) : new Date()
    const trendFrom = new Date(trendTo.getFullYear(), trendTo.getMonth() - 5, 1)
    const [dashboard, trendDashboard, insights] = await Promise.all([
      api.get("dashboard", {
        searchParams: {
          bucket: query?.bucket ?? "month",
          topBy: query?.topBy ?? "net_revenue",
          topLimit: query?.topLimit ?? 5,
          ...(query?.from ? { from: query.from } : {}),
          ...(query?.to ? { to: query.to } : {}),
        },
      }).json<DashboardData>(),
      api.get("dashboard", {
        searchParams: {
          bucket: "month",
          topBy: query?.topBy ?? "net_revenue",
          topLimit: query?.topLimit ?? 5,
          from: trendFrom.toISOString(),
          to: trendTo.toISOString(),
        },
      }).json<DashboardData>(),
      api.get("intelligence/insights", {
        searchParams: { limit: 5, state: "accepted" },
      }).json<{ data: AiInsight[]; availability: "available" | "unavailable" }>(),
    ])
    set({
      dashboard,
      trendDashboard,
      insights: insights.data,
      insightAvailability: insights.availability,
    })
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
      }).json<{ data: AiInsight[]; availability: "available" | "unavailable" }>(),
    ])
    set({
      forecasts: forecasts.data,
      recommendations: recommendations.data,
      insights: insights.data,
      insightAvailability: insights.availability,
    })
  },
  runForecasts: async () => {
    await api.post("intelligence/forecasts/runs", {
      headers: idempotencyHeaders(),
      json: { includeRevenue: true },
    })
    await get().loadIntelligence()
  },
  runRecommendations: async () => {
    await api.post("intelligence/recommendations/runs", {
      headers: idempotencyHeaders(),
    })
    await get().loadIntelligence()
  },
  runInsights: async () => {
    await api.post("intelligence/insights/runs", {
      headers: idempotencyHeaders(),
    })
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
