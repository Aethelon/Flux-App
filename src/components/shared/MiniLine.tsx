import { cn } from "@/lib/utils"

// Mini gráfico de linha: linha/área em SVG esticado (preserveAspectRatio none)
// com uma coluna de hover por mês sobreposta — o ponto e o tooltip são HTML
// posicionados pela mesma fórmula vertical do SVG, então ficam exatamente
// sobre a linha. A série é normalizada entre o menor e o maior valor (12% a
// 88% da altura) e o gráfico estica na vertical para preencher o card.
// Compartilhado entre o Dashboard, o Histórico e a Inteligência. A cor é a
// variável CSS do tema (padrão índigo; ex.: "--color-danger" para métricas
// negativas, como estoque crítico).
export function MiniLine({
  data,
  color = "--color-accent",
}: {
  data: { label: string; value: number; display: string; highlight?: boolean }[]
  color?: string
}) {
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const range = Math.max(...values) - min || 1
  // Posição vertical (%) a partir da base, com 12% de folga em cima e embaixo.
  const pos = (v: number) => 12 + ((v - min) / range) * 76

  const step = 100 / data.length
  const points = data.map((d, i) => ({ x: (i + 0.5) * step, y: 100 - pos(d.value) }))
  const line =
    `M 0 ${points[0].y} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L 100 ${points[points.length - 1].y}`
  const area = `${line} L 100 100 L 0 100 Z`

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="relative min-h-24 flex-1">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <path d={area} fill={`var(${color})`} fillOpacity={0.08} />
          <path
            d={line}
            fill="none"
            stroke={`var(${color})`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="absolute inset-0 flex">
          {data.map((point) => (
            <div key={point.label} className="group relative flex-1">
              <span
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full transition-transform group-hover:scale-125",
                  point.highlight ? "size-2.5" : "size-2 border-2 bg-(--color-surface)"
                )}
                style={{
                  bottom: `${pos(point.value)}%`,
                  ...(point.highlight
                    ? { backgroundColor: `var(${color})` }
                    : { borderColor: `var(${color})` }),
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-(--color-border) bg-(--color-surface-raised) px-2 py-1 text-[11px] font-semibold text-(--color-text-primary) opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                style={{ bottom: `calc(${pos(point.value)}% + 10px)` }}
              >
                {point.display}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex">
        {data.map((point) => (
          <span
            key={point.label}
            className="flex-1 text-center text-[11px] font-medium text-(--color-text-secondary)"
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}
