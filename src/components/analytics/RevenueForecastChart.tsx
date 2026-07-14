"use client"

import { useRef, useState } from "react"
import { formatCurrency } from "@/lib/formatters"

export interface ForecastPoint {
  label: string
  realized: number | null
  projected: number | null
}

const W = 720
const H = 260
const PAD_L = 52
const PAD_R = 14
const PAD_T = 16
const PAD_B = 30
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const values = data.flatMap((d) => [d.realized, d.projected]).filter((v): v is number => v != null)
  const yMax = niceCeil(Math.max(...values, 1))
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax)

  const x = (i: number) => (data.length <= 1 ? PAD_L : PAD_L + (i / (data.length - 1)) * PLOT_W)
  const y = (v: number) => PAD_T + PLOT_H - (v / yMax) * PLOT_H

  function buildPath(key: "realized" | "projected") {
    const pts = data
      .map((d, i) => ({ i, v: d[key] }))
      .filter((p): p is { i: number; v: number } => p.v != null)
    if (pts.length === 0) return ""
    return pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(p.i)} ${y(p.v)}`).join(" ")
  }

  const realizedPath = buildPath("realized")
  const projectedPath = buildPath("projected")

  // Area fill under the realized line
  const realizedPts = data
    .map((d, i) => ({ i, v: d.realized }))
    .filter((p): p is { i: number; v: number } => p.v != null)
  const areaPath =
    realizedPts.length > 0
      ? `${realizedPts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(p.i)} ${y(p.v)}`).join(" ")} ` +
        `L ${x(realizedPts[realizedPts.length - 1].i)} ${y(0)} L ${x(realizedPts[0].i)} ${y(0)} Z`
      : ""

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const relX = ((e.clientX - rect.left) / rect.width) * W
    const ratio = (relX - PAD_L) / PLOT_W
    const idx = Math.round(ratio * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, idx)))
  }

  const active = hover != null ? data[hover] : null
  const activeValue = active ? (active.realized ?? active.projected ?? 0) : 0
  const activeLeft = hover != null ? (x(hover) / W) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
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
              x2={W - PAD_R}
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
        {data.map((d, i) => (
          <text
            key={d.label}
            x={x(i)}
            y={H - 10}
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
          const v = d.realized ?? d.projected
          if (v == null) return null
          const isProjected = d.realized == null
          return (
            <circle
              key={d.label}
              cx={x(i)}
              cy={y(v)}
              r={3}
              fill="var(--color-surface)"
              stroke={isProjected ? "var(--color-accent)" : "var(--color-success)"}
              strokeWidth={2}
            />
          )
        })}

        {/* hover crosshair */}
        {active && (
          <>
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={PAD_T}
              y2={PAD_T + PLOT_H}
              stroke="var(--color-text-secondary)"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
            <circle
              cx={x(hover!)}
              cy={y(activeValue)}
              r={5}
              fill={active.realized == null ? "var(--color-accent)" : "var(--color-success)"}
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-(--color-border) bg-(--color-surface-raised) px-3 py-2 shadow-md"
          style={{ left: `${activeLeft}%` }}
        >
          <p className="text-[11px] font-medium text-(--color-text-secondary)">{active.label}</p>
          <p className="text-[13px] font-semibold text-(--color-text-primary)">
            {formatCurrency(activeValue)}
          </p>
          <p className="text-[10px] text-(--color-text-secondary)">
            {active.realized == null ? "Projetado" : "Realizado"}
          </p>
        </div>
      )}

      <div className="mt-2 flex items-center justify-center gap-5">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-(--color-success)" />
          <span className="text-[12px] text-(--color-text-secondary)">Faturamento Realizado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0 w-4 border-t-2 border-dashed border-(--color-accent)" />
          <span className="text-[12px] text-(--color-text-secondary)">Faturamento Projetado</span>
        </div>
      </div>
    </div>
  )
}
