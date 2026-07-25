"use client"

import { create } from "zustand"
import { api, idempotencyHeaders } from "@/lib/api"

export interface DashboardData {
  dataFreshnessAt: string
  sales: {
    netRevenueCents: number
    completedSaleCount: number
    averageTicketCents: number | null
  }
  revenueSeries: Array<{
    bucketStart: string
    netRevenueCents: number
  }>
  topProducts: {
    data: Array<{
      productId: string
      name: string
      unitsSold: number
      netRevenueCents: number
    }>
  }
  inventory: {
    soldOutCount: number
    lowStockCount: number
  }
  serviceOrders: {
    createdCount: number
    completedCount: number
    openCount: number
    overdueOpenCount: number
    completionRate: number | null
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
  }>
}

export interface Recommendation {
  id: string
  type: "replenishment" | "promotion" | "overstock_review"
  product: { id: string; name: string }
  proposedValue: unknown
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
  forecasts: ForecastRun[]
  recommendations: Recommendation[]
  insights: AiInsight[]
  insightAvailability: "available" | "unavailable"
  loadDashboard: () => Promise<void>
  loadIntelligence: () => Promise<void>
  runForecasts: () => Promise<void>
  runRecommendations: () => Promise<void>
  runInsights: () => Promise<void>
  reviewRecommendation: (id: string, decision: "accepted" | "rejected") => Promise<void>
  reviewInsight: (id: string, decision: "accepted" | "rejected") => Promise<void>
}

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  dashboard: null,
  forecasts: [],
  recommendations: [],
  insights: [],
  insightAvailability: "available",
  loadDashboard: async () => {
    const [dashboard, insights] = await Promise.all([
      api.get("dashboard", {
        searchParams: { bucket: "month", topLimit: 5 },
      }).json<DashboardData>(),
      api.get("intelligence/insights", {
        searchParams: { limit: 5, state: "accepted" },
      }).json<{ data: AiInsight[]; availability: "available" | "unavailable" }>(),
    ])
    set({
      dashboard,
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
    await api.post(`intelligence/recommendations/${id}/review`, {
      headers: idempotencyHeaders(),
      json: {
        decision,
        reason: "Reviewed through the intelligence dashboard.",
      },
    })
    await get().loadIntelligence()
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
