"use client"

import { useEffect, useState } from "react"
import { Check, RefreshCw, Sparkles, TrendingUp, X } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import {
  type Recommendation,
  useAnalyticsStore,
} from "@/store/analyticsStore"

const CARD = "rounded-xl border border-(--color-border) bg-(--color-surface) p-6"

function proposedValue(value: unknown): string {
  if (value === null || value === undefined) return "Sem valor proposto"
  if (typeof value === "string" || typeof value === "number") return String(value)
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key}: ${String(item)}`)
    .join(" · ")
}

const RECOMMENDATION_LABEL: Record<Recommendation["type"], string> = {
  replenishment: "Reposição",
  promotion: "Promoção",
  overstock_review: "Revisão de excesso",
}

export default function InteligenciaPage() {
  const dashboard = useAnalyticsStore((state) => state.dashboard)
  const forecasts = useAnalyticsStore((state) => state.forecasts)
  const recommendations = useAnalyticsStore((state) => state.recommendations)
  const insights = useAnalyticsStore((state) => state.insights)
  const insightAvailability = useAnalyticsStore((state) => state.insightAvailability)
  const loadDashboard = useAnalyticsStore((state) => state.loadDashboard)
  const loadIntelligence = useAnalyticsStore((state) => state.loadIntelligence)
  const runForecasts = useAnalyticsStore((state) => state.runForecasts)
  const runRecommendations = useAnalyticsStore((state) => state.runRecommendations)
  const runInsights = useAnalyticsStore((state) => state.runInsights)
  const reviewRecommendation = useAnalyticsStore((state) => state.reviewRecommendation)
  const reviewInsight = useAnalyticsStore((state) => state.reviewInsight)
  const [running, setRunning] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([loadDashboard(), loadIntelligence()])
      .catch(() => toast.error("Não foi possível carregar a inteligência."))
  }, [loadDashboard, loadIntelligence])

  async function execute(label: string, action: () => Promise<void>) {
    setRunning(label)
    try {
      await action()
      toast.success(`${label} solicitada. O processamento continuará em segundo plano.`)
    } catch {
      toast.error(`Não foi possível iniciar: ${label.toLowerCase()}.`)
    } finally {
      setRunning(null)
    }
  }

  const revenueForecast = forecasts.find((forecast) => forecast.targetType === "monthly_revenue")
  const demandForecasts = forecasts.filter((forecast) => forecast.targetType === "product_demand")

  return (
    <div>
      <PageHeader
        title="Inteligência"
        subtitle="Previsões determinísticas, recomendações e explicações persistidas"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          className="gap-2"
          disabled={running !== null}
          onClick={() => execute("Previsão", runForecasts)}
        >
          <TrendingUp size={15} />
          Gerar previsões
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          disabled={running !== null}
          onClick={() => execute("Recomendação", runRecommendations)}
        >
          <RefreshCw size={15} className={running === "Recomendação" ? "animate-spin" : ""} />
          Gerar recomendações
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          disabled={running !== null || insightAvailability === "unavailable"}
          onClick={() => execute("Explicação por IA", runInsights)}
        >
          <Sparkles size={15} />
          Gerar explicações
        </Button>
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => void Promise.all([loadDashboard(), loadIntelligence()])}
        >
          <RefreshCw size={15} />
          Atualizar
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={CARD}>
          <p className="text-[11px] font-semibold uppercase text-(--color-text-secondary)">Faturamento líquido</p>
          <p className="mt-2 text-[24px] font-semibold text-(--color-text-primary)">
            {formatCurrency((dashboard?.sales.netRevenueCents ?? 0) / 100)}
          </p>
        </div>
        <div className={CARD}>
          <p className="text-[11px] font-semibold uppercase text-(--color-text-secondary)">Vendas concluídas</p>
          <p className="mt-2 text-[24px] font-semibold text-(--color-text-primary)">
            {dashboard?.sales.completedSaleCount ?? 0}
          </p>
        </div>
        <div className={CARD}>
          <p className="text-[11px] font-semibold uppercase text-(--color-text-secondary)">Ticket médio</p>
          <p className="mt-2 text-[24px] font-semibold text-(--color-text-primary)">
            {formatCurrency((dashboard?.sales.averageTicketCents ?? 0) / 100)}
          </p>
        </div>
      </div>

      <section className={cn(CARD, "mb-6")}>
        <div className="mb-4">
          <h2 className="text-[18px] font-semibold text-(--color-text-primary)">Previsão de faturamento</h2>
          <p className="text-[12px] text-(--color-text-secondary)">
            Método {revenueForecast?.method ?? "indisponível"} · versão {revenueForecast?.calculationVersion ?? "—"}
          </p>
        </div>
        {revenueForecast?.points.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {revenueForecast.points.map((point) => (
              <div key={point.id} className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-4">
                <p className="text-[12px] text-(--color-text-secondary)">
                  {new Date(`${point.bucketStart}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </p>
                <p className="mt-1 text-[18px] font-semibold text-(--color-text-primary)">
                  {formatCurrency(point.operationalValue / 100)}
                </p>
                {point.lowerLimit !== null && point.upperLimit !== null && (
                  <p className="mt-1 text-[11px] text-(--color-text-secondary)">
                    Intervalo: {formatCurrency(point.lowerLimit / 100)} a {formatCurrency(point.upperLimit / 100)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-(--color-text-secondary)">Nenhuma previsão publicada.</p>
        )}
      </section>

      <section className={cn(CARD, "mb-6")}>
        <h2 className="mb-4 text-[18px] font-semibold text-(--color-text-primary)">Demanda por produto</h2>
        <div className="flex flex-col gap-3">
          {demandForecasts.length === 0 ? (
            <p className="text-[13px] text-(--color-text-secondary)">Nenhuma previsão publicada.</p>
          ) : demandForecasts.map((forecast) => (
            <div key={forecast.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-4">
              <div>
                <p className="font-semibold text-(--color-text-primary)">{forecast.product?.name ?? "Produto"}</p>
                <p className="text-[12px] text-(--color-text-secondary)">
                  {forecast.method} · confiança {forecast.confidenceScore ?? "—"} · {forecast.status}
                </p>
              </div>
              <span className="text-[14px] font-semibold text-(--color-accent)">
                {forecast.points[0]?.operationalValue ?? 0} un.
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(CARD, "mb-6")}>
        <h2 className="mb-4 text-[18px] font-semibold text-(--color-text-primary)">Recomendações</h2>
        <div className="flex flex-col gap-3">
          {recommendations.length === 0 ? (
            <p className="text-[13px] text-(--color-text-secondary)">Nenhuma recomendação persistida.</p>
          ) : recommendations.map((recommendation) => (
            <div key={recommendation.id} className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-(--color-text-primary)">
                    {RECOMMENDATION_LABEL[recommendation.type]} · {recommendation.product.name}
                  </p>
                  <p className="mt-1 text-[12px] text-(--color-text-secondary)">
                    {proposedValue(recommendation.proposedValue)}
                  </p>
                  <p className="mt-1 text-[11px] text-(--color-text-secondary)">
                    Confiança {recommendation.confidenceScore ?? "—"} · estado {recommendation.state}
                  </p>
                </div>
                {recommendation.state === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void reviewRecommendation(recommendation.id, "rejected")}>
                      <X size={14} />
                    </Button>
                    <Button size="sm" onClick={() => void reviewRecommendation(recommendation.id, "accepted")}>
                      <Check size={14} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={CARD}>
        <h2 className="mb-1 text-[18px] font-semibold text-(--color-text-primary)">Explicações da IA</h2>
        <p className="mb-4 text-[12px] text-(--color-text-secondary)">
          Conteúdo explicativo vinculado às evidências matemáticas. Nenhuma ação operacional é executada pela IA.
        </p>
        <div className="flex flex-col gap-3">
          {insights.length === 0 ? (
            <p className="text-[13px] text-(--color-text-secondary)">
              {insightAvailability === "available" ? "Nenhuma explicação persistida." : "Provedor de IA indisponível."}
            </p>
          ) : insights.map((insight) => (
            <div key={insight.id} className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-4">
              <p className="text-[13px] text-(--color-text-primary)">{insight.text}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] uppercase text-(--color-text-secondary)">
                  {insight.type} · {insight.provider} · {insight.modelId} · {insight.state}
                </span>
                {insight.state === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void reviewInsight(insight.id, "rejected")}>
                      Rejeitar
                    </Button>
                    <Button size="sm" onClick={() => void reviewInsight(insight.id, "accepted")}>
                      Aprovar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
