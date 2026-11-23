"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale } from "@/components/layout/LocaleProvider"
import { INTELLIGENCE_MESSAGES } from "@/lib/intelligence-messages"
import { formatCurrency } from "@/lib/formatters"

export interface ForecastPoint {
  label: string
  realized: number | null
  projected: number | null
  realizedPartial?: boolean
}

const W = 720
const H = 260
const PAD_L = 52
const PAD_R = 14
const PAD_T = 16
const PAD_B = 30

function niceCeil(value: number): number {
  if (value <= 0) return 0
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

function abbrev(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`
  return `R$ ${value}`
}

export function RevenueForecastChart({ data }: { data: ForecastPoint[] }) {
  const { locale } = useLocale()
  const messages = INTELLIGENCE_MESSAGES[locale]
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [availableWidth, setAvailableWidth] = useState(W)
  const compact = availableWidth < 480
  const width = compact ? availableWidth : W
  const height = compact ? 200 : H
  const plotWidth = width - PAD_L - PAD_R
  const plotHeight = height - PAD_T - PAD_B
  const lastIndex = data.length - 1
  const labelStep = compact ? Math.max(1, Math.ceil((lastIndex * 34) / plotWidth)) : 1

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      const measuredWidth = Math.floor(entry.contentRect.width)
      if (measuredWidth > PAD_L + PAD_R) setAvailableWidth(measuredWidth)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const values = data.flatMap((d) => [d.realized, d.projected]).filter((v): v is number => v != null)
  const yMax = niceCeil(Math.max(...values, 1))
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax)

  const x = (i: number) => (data.length <= 1 ? PAD_L : PAD_L + (i / (data.length - 1)) * plotWidth)
  const y = (v: number) => PAD_T + plotHeight - (v / yMax) * plotHeight

  function seriesPoints(key: "realized" | "projected") {
    return data
      .map((d, i) => ({ i, v: d[key] }))
      .filter((p): p is { i: number; v: number } => p.v != null)
  }

  function buildPath(points: ReturnType<typeof seriesPoints>) {
    return points.map((point, index) => (
      `${index === 0 ? "M" : "L"} ${x(point.i)} ${y(point.v)}`
    )).join(" ")
  }

  const realizedPts = seriesPoints("realized")
  const projectedPts = seriesPoints("projected")
  const firstProjected = projectedPts[0]
  const projectionAnchor = firstProjected && realizedPts.findLast(({ i }) => i < firstProjected.i)
  const realizedPath = buildPath(realizedPts)
  const projectedPath = buildPath(projectionAnchor ? [projectionAnchor, ...projectedPts] : projectedPts)

  // Area fill under the realized line
  const areaPath =
    realizedPts.length > 0
      ? `${realizedPath} ` +
        `L ${x(realizedPts[realizedPts.length - 1].i)} ${y(0)} L ${x(realizedPts[0].i)} ${y(0)} Z`
      : ""

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const relX = ((e.clientX - rect.left) / rect.width) * width
    const ratio = (relX - PAD_L) / plotWidth
    const idx = Math.round(ratio * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, idx)))
  }

  const active = hover != null ? data[hover] : null
  const activeLeft = hover != null ? (x(hover) / width) * 100 : 0
  const belowForecastIndex = data.findIndex(({ realizedPartial, realized, projected }) => (
    realizedPartial && realized != null && projected != null && realized < projected
  ))
  const activeBelowForecast = hover === belowForecastIndex

  return (
    <div ref={containerRef} className="relative min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleMove}
      >
        <defs>
          <linearGradient id="realized-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines + y labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_L}
              x2={width - PAD_R}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-border)"
              strokeWidth={1}
              strokeOpacity={0.6}
            />
            <text
              x={PAD_L - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-(--color-text-secondary)"
              fontSize={11}
            >
              {abbrev(t)}
            </text>
          </g>
        ))}

        {/* x labels */}
        {data.map((d, i) => (i === lastIndex || (i % labelStep === 0 && lastIndex - i >= labelStep)) && (
          <text
            key={d.label}
            x={x(i)}
            y={height - 10}
            textAnchor="middle"
            className="fill-(--color-text-secondary)"
            fontSize={11}
          >
            {d.label}
          </text>
        ))}

        {areaPath && <path d={areaPath} fill="url(#realized-area)" />}
        {realizedPath && (
          <path d={realizedPath} fill="none" stroke="var(--color-success)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {projectedPath && (
          <path
            d={projectedPath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeDasharray="6 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* points */}
        {data.map((d, i) => {
          const belowForecast = i === belowForecastIndex
          const realizedColor = belowForecast ? "var(--color-danger)" : "var(--color-success)"
          return (
            <g key={d.label}>
              {d.realized != null && (
                <circle
                  cx={x(i)}
                  cy={y(d.realized)}
                  r={belowForecast ? 4 : 3}
                  fill={belowForecast ? realizedColor : "var(--color-surface)"}
                  stroke={realizedColor}
                  strokeWidth={2}
                />
              )}
              {d.projected != null && (
                <circle
                  cx={x(i)}
                  cy={y(d.projected)}
                  r={3}
                  fill="var(--color-surface)"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                />
              )}
            </g>
          )
        })}

        {/* hover crosshair */}
        {active && (
          <>
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={PAD_T}
              y2={PAD_T + plotHeight}
              stroke="var(--color-text-secondary)"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
            {active.realized != null && (
              <circle
                cx={x(hover!)}
                cy={y(active.realized)}
                r={5}
                fill={activeBelowForecast ? "var(--color-danger)" : "var(--color-success)"}
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
            )}
            {active.projected != null && (
              <circle
                cx={x(hover!)}
                cy={y(active.projected)}
                r={5}
                fill="var(--color-accent)"
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
            )}
          </>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-max max-w-full rounded-lg border border-(--color-border) bg-(--color-surface-raised) px-3 py-2 shadow-md"
          style={{
            left: compact ? undefined : `clamp(6rem, ${activeLeft}%, calc(100% - 6rem))`,
            right: compact ? 0 : undefined,
            transform: compact ? undefined : "translateX(-50%)",
          }}
        >
          <p className="text-[11px] font-medium text-(--color-text-secondary)">{active.label}</p>
          {active.realized != null && (
            <p
              className="text-[11px]"
              style={{ color: activeBelowForecast ? "var(--color-text-danger)" : "var(--color-success)" }}
            >
              {active.realizedPartial ? messages.realizedPartial : messages.realized}: <span className="font-semibold">{formatCurrency(active.realized)}</span>
            </p>
          )}
          {active.projected != null && (
            <p className="text-[11px] text-(--color-accent)">
              {messages.projected}: <span className="font-semibold">{formatCurrency(active.projected)}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-(--color-success)" />
          <span className="text-[12px] text-(--color-text-secondary)">{messages.realizedRevenue}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0 w-4 border-t-2 border-dashed border-(--color-accent)" />
          <span className="text-[12px] text-(--color-text-secondary)">{messages.projectedRevenue}</span>
        </div>
        {belowForecastIndex !== -1 && (
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-(--color-danger)" aria-hidden="true" />
            <span className="text-[12px] text-(--color-text-secondary)">{messages.belowForecast}</span>
          </div>
        )}
      </div>
    </div>
  )
}
