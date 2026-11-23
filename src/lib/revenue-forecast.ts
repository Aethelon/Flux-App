import type { Locale } from "@/lib/locale"
import type { ForecastPoint } from "@/components/analytics/RevenueForecastChart"
import type { DashboardData, ForecastRun } from "@/store/analyticsStore"

export function monthLabel(value: string, locale: Locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, { month: "short" })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "")
}

export function buildRevenueForecastChart(
  dashboard: Pick<DashboardData, "dateRange" | "revenueSeries" | "timezone">,
  forecast?: Pick<ForecastRun, "points">,
  locale: Locale = "pt-BR",
): ForecastPoint[] {
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: dashboard.timezone,
    year: "numeric",
    month: "2-digit",
  }).format(new Date(dashboard.dateRange.to))

  const points = new Map<string, ForecastPoint>()
  for (const point of dashboard.revenueSeries) {
    const month = point.bucketStart.slice(0, 7)
    points.set(month, {
      label: monthLabel(point.bucketStart, locale),
      realized: point.netRevenueCents / 100,
      projected: null,
      realizedPartial: month === currentMonth,
    })
  }

  for (const point of forecast?.points ?? []) {
    const month = point.bucketStart.slice(0, 7)
    if (month < currentMonth) continue
    const actual = points.get(month)
    points.set(month, {
      label: monthLabel(point.bucketStart, locale),
      realized: actual?.realized ?? null,
      projected: point.operationalValue / 100,
      realizedPartial: actual?.realizedPartial,
    })
  }

  return [...points.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, point]) => point)
}
