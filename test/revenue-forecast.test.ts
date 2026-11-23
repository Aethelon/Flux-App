import assert from "node:assert/strict"
import test from "node:test"
import { buildRevenueForecastChart } from "../src/lib/revenue-forecast.ts"
import type { ForecastRun } from "../src/store/analyticsStore.ts"

function bucket(month: string, netRevenueCents: number) {
  return { bucketStart: `${month}-01`, completedSaleCount: 0, netRevenueCents }
}

function projected(month: string): ForecastRun["points"][number] {
  return {
    id: month,
    bucketStart: `${month}-01`,
    operationalValue: 4_000_000,
    lowerLimit: null,
    upperLimit: null,
    seasonalFactor: null,
    calendarEvents: [],
  }
}

test("keeps zero-revenue months after the training window of a saved forecast", () => {
  const points = buildRevenueForecastChart({
    timezone: "America/Recife",
    dateRange: { from: "2026-08-01T03:00:00Z", to: "2026-11-23T13:00:00Z" },
    revenueSeries: [
      bucket("2026-08", 2_450_000),
      bucket("2026-09", 0),
      bucket("2026-10", 0),
      bucket("2026-11", 0),
    ],
  }, {
    points: ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"].map(projected),
  })

  assert.deepEqual(points.map(({ label, realized, projected }) => [label, realized, projected]), [
    ["ago", 24_500, null],
    ["set", 0, null],
    ["out", 0, null],
    ["nov", 0, 40_000],
    ["dez", null, 40_000],
  ])
  assert.deepEqual(points.filter((point) => point.realizedPartial).map((point) => point.label), ["nov"])
})

test("marks the partial month in the business timezone even without a saved forecast", () => {
  const points = buildRevenueForecastChart({
    timezone: "America/Recife",
    dateRange: { from: "2026-10-01T03:00:00Z", to: "2026-11-01T02:00:00Z" },
    revenueSeries: [bucket("2026-10", 0)],
  })

  assert.deepEqual(points, [{ label: "out", realized: 0, projected: null, realizedPartial: true }])
})
