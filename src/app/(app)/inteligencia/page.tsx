"use client"

import { useState } from "react"
import {
  DollarSign,
  ShoppingCart,
  TriangleAlert,
  Wrench,
  Sparkles,
  TrendingUp,
  TrendingDown,
  FileText,
  Lightbulb,
  Loader2,
  PackagePlus,
  RefreshCw,
  X,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RevenueForecastChart, type ForecastPoint } from "@/components/analytics/RevenueForecastChart"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { SEASONALITIES } from "@/data/insights"

type Segment = "produto" | "servico"
type Period = "mensal" | "trimestral"

const FORECAST: ForecastPoint[] = [
  { label: "Jan", realized: 22000, projected: null },
  { label: "Fev", realized: 26500, projected: null },
  { label: "Mar", realized: 31200, projected: null },
  { label: "Abr", realized: 35800, projected: null },
  { label: "Mai", realized: 42850, projected: 42850 },
  { label: "Jun", realized: null, projected: 47500 },
  { label: "Jul", realized: null, projected: 52000 },
  { label: "Ago", realized: null, projected: 58200 },
]

interface TopSale {
  item: string
  code: string
  sales: string
  revenue: number
}

const TOP_SALES: Record<Segment, TopSale[]> = {
  produto: [
    { item: "Travesseiro de Pluma de Ganso",    code: "3212310-004", sales: "490 un", revenue: 54000 },
    { item: "Tapete Fibra Natural Geométrico",  code: "9876412-771", sales: "150 un", revenue: 24000 },
    { item: "Edredom Casal Karsten",            code: "9762388-120", sales: "88 un",  revenue: 17800 },
    { item: "Toalha Premium Karsten",           code: "9874563-509", sales: "97 un",  revenue: 13600 },
  ],
  servico: [
    { item: "Higienização de Colchão",          code: "SRV-HIG-002", sales: "180 os", revenue: 12600 },
    { item: "Impermeabilização de Sofá",        code: "SRV-IMP-003", sales: "75 os",  revenue: 9750 },
    { item: "Lavagem de Edredom",               code: "SRV-LAV-001", sales: "210 os", revenue: 8400 },
    { item: "Restauração de Cortinas",          code: "SRV-RES-004", sales: "40 os",  revenue: 6000 },
  ],
}

const LOW_SALES: Record<Segment, TopSale[]> = {
  produto: [
    { item: "Kit de Enxoval Premium",          code: "8823410-115", sales: "3 un",  revenue: 900 },
    { item: "Jogo Cama King Karsten",          code: "7719022-380", sales: "5 un",  revenue: 1750 },
    { item: "Manta Nasa Casal",                code: "6650187-244", sales: "8 un",  revenue: 1200 },
    { item: "Cortina Blackout 2,80m",          code: "5540321-902", sales: "11 un", revenue: 2090 },
  ],
  servico: [
    { item: "Reparo de Edredom",               code: "SRV-REP-008", sales: "9 os",  revenue: 810 },
    { item: "Costura de Bainha",               code: "SRV-BAI-007", sales: "25 os", revenue: 500 },
    { item: "Troca de Zíper",                  code: "SRV-ZIP-006", sales: "18 os", revenue: 540 },
    { item: "Ajuste de Cortinas",              code: "SRV-AJU-005", sales: "12 os", revenue: 960 },
  ],
}

interface Kpi {
  label: string
  value: string
  icon: LucideIcon
  iconClass: string
  hint: string
  hintClass?: string
}

const KPIS: Kpi[] = [
  { label: "Faturamento do Mês", value: "R$ 42.850,00", icon: DollarSign,    iconClass: "bg-(--color-success)/15 text-(--color-success)", hint: "+12,5% vs mês anterior", hintClass: "text-(--color-success)" },
  { label: "Vendas Realizadas",  value: "47",           icon: ShoppingCart,  iconClass: "bg-primary/15 text-(--color-accent)",   hint: "vendas no mês" },
  { label: "Estoque Crítico",    value: "5",            icon: TriangleAlert, iconClass: "bg-(--color-warning)/15 text-(--color-warning)", hint: "produtos abaixo do mínimo", hintClass: "text-(--color-warning)" },
  { label: "Ordens de Serviço",  value: "13",           icon: Wrench,        iconClass: "bg-(--color-info)/15 text-(--color-info)",       hint: "3 em atraso" },
]

interface Promo {
  title: string
  subtitle: string
  description: string
}

const PROMOS: Promo[] = [
  {
    title: "Kit de Enxoval",
    subtitle: "Produtos A, B, C, D, E",
    description:
      "Monte kits promocionais com desconto progressivo (30% no 2º item, 20% no 3º) para acelerar o giro de itens parados. Estoque com capital imobilizado e giro zero.",
  },
  {
    title: "Jogo Cama King Karsten",
    subtitle: "Venda casada",
    description:
      "Ofereça em venda casada ao adquirir qualquer kit de enxoval, ou como brinde em compras acima de um valor definido. Item classificado como encalhe, sem giro no período.",
  },
]

interface Replenishment {
  product: string
  reason: string
  suggestedQty: string
  urgency: "alta" | "média"
}

const REPLENISHMENTS: Replenishment[] = [
  {
    product: "Travesseiro de Pluma de Ganso",
    reason: "Alto giro (490 un/mês) e estoque abaixo do mínimo de segurança.",
    suggestedQty: "Repor 300 un",
    urgency: "alta",
  },
  {
    product: "Toalha Premium Karsten",
    reason: "Estoque atual cobre apenas 6 dias de venda no ritmo atual.",
    suggestedQty: "Repor 150 un",
    urgency: "alta",
  },
  {
    product: "Edredom Casal Karsten",
    reason: "Giro constante; reposição sugerida para manter o LEC.",
    suggestedQty: "Repor 90 un",
    urgency: "média",
  },
]

type Tone = "success" | "warning" | "danger" | "accent" | "neutral"

type Viz =
  | { kind: "progress"; percent: number; target?: number; tone: Tone; caption?: string }
  | { kind: "spark"; points: number[]; delta: string; deltaPositive: boolean; tone: Tone }
  | { kind: "compare"; a: { label: string; percent: number; tone: Tone }; b: { label: string; percent: number; tone: Tone } }

interface Metric {
  title: string
  value: string
  description: string
  viz: Viz
}

const ANALYSES: { section: string; icon: LucideIcon; metrics: Metric[] }[] = [
  {
    section: "Análise de Estoque Avançada",
    icon: TriangleAlert,
    metrics: [
      {
        title: "Giro de Estoque", value: "4,2x/mês",
        description: "Quantas vezes o estoque é vendido e reposto no mês (vendas ÷ estoque médio).",
        viz: { kind: "spark", points: [3.4, 3.6, 3.8, 3.9, 4.0, 4.2], delta: "+6%", deltaPositive: true, tone: "success" },
      },
      {
        title: "Cobertura de Estoque", value: "22 dias",
        description: "Dias que o estoque atual dura no ritmo de venda médio (estoque ÷ venda diária).",
        viz: { kind: "progress", percent: 73, tone: "success", caption: "Faixa saudável: 15 a 30 dias" },
      },
      {
        title: "Taxa de Ruptura", value: "3,2%",
        description: "Produtos que ficaram com estoque zerado em algum momento do mês.",
        viz: { kind: "progress", percent: 32, target: 50, tone: "success", caption: "Meta: abaixo de 5%" },
      },
    ],
  },
  {
    section: "Análise de Produção",
    icon: Wrench,
    metrics: [
      {
        title: "Índice de Atraso", value: "12%",
        description: "Percentual de ordens entregues com atraso.",
        viz: { kind: "progress", percent: 12, target: 10, tone: "warning", caption: "Meta: abaixo de 10%" },
      },
      {
        title: "Lead Time Médio por Tipo", value: "4,5 dias",
        description: "Tempo médio de produção por ordem.",
        viz: { kind: "spark", points: [6, 5.5, 5.2, 5, 4.8, 4.5], delta: "-8%", deltaPositive: true, tone: "success" },
      },
    ],
  },
  {
    section: "Análise de Clientes",
    icon: ShoppingCart,
    metrics: [
      {
        title: "Ticket Médio", value: "R$ 910",
        description: "Valor médio por venda no mês atual.",
        viz: { kind: "spark", points: [820, 850, 870, 890, 900, 910], delta: "+5,4%", deltaPositive: true, tone: "success" },
      },
      {
        title: "Frequência de Compra", value: "2,3x/mês",
        description: "Recorrência média por cliente ativo.",
        viz: { kind: "spark", points: [1.8, 1.9, 2.0, 2.1, 2.2, 2.3], delta: "+6%", deltaPositive: true, tone: "accent" },
      },
      {
        title: "Retenção de Clientes", value: "86%",
        description: "Percentual de clientes recorrentes.",
        viz: { kind: "progress", percent: 86, target: 80, tone: "success", caption: "Meta: 80%" },
      },
    ],
  },
]

interface ReportSection {
  title: string
  icon: LucideIcon
  iconClass: string
  intro?: string
  bullets?: string[]
}

const REPORT: ReportSection[] = [
  {
    title: "Resumo Executivo",
    icon: FileText,
    iconClass: "text-(--color-accent)",
    intro:
      "O faturamento do mês atingiu R$ 42.850, com crescimento de 12,5% frente ao mês anterior e mantendo a tendência de alta projetada para os próximos meses (previsão de R$ 58,2k em agosto). A operação está saudável, mas há capital imobilizado em itens de baixo giro e pontos de atenção no estoque e na produção.",
  },
  {
    title: "Destaques do Período",
    icon: TrendingUp,
    iconClass: "text-(--color-success)",
    bullets: [
      "Tapete Fibra Natural Geométrico lidera em lucratividade, com 72% de margem e R$ 17.280 de lucro no mês.",
      "47 vendas realizadas, com ticket médio de R$ 910 por venda.",
      "Retenção de clientes em 86%, acima da meta de 80%.",
    ],
  },
  {
    title: "Pontos de Atenção",
    icon: TriangleAlert,
    iconClass: "text-(--color-warning)",
    bullets: [
      "5 produtos abaixo do estoque mínimo — risco de ruptura em itens de alta saída.",
      "3 ordens de serviço em atraso (12% do total), acima da meta de 10%.",
      "Ciclo financeiro em 34 dias, 4 dias acima da meta ideal.",
    ],
  },
  {
    title: "Recomendações",
    icon: Lightbulb,
    iconClass: "text-(--color-accent)",
    bullets: [
      "Estruturar kits promocionais 'Monte seu Enxoval' para girar os itens encalhados (Kit de Enxoval e Jogo Cama King Karsten).",
      "Antecipar a reposição dos 5 itens críticos antes do pico sazonal do Dia das Mães (+50% previsto).",
      "Revisar prazos de produção para reduzir o índice de atraso e o lead time médio (4,5 dias).",
    ],
  },
]

const TONE_VAR: Record<Tone, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  accent: "var(--color-accent)",
  neutral: "var(--color-text-secondary)",
}

function clampPct(v: number) {
  return Math.max(0, Math.min(100, v))
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-(--color-border) bg-(--color-surface) p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === o.value
              ? "bg-(--color-surface-raised) text-(--color-text-primary)"
              : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
          )}
        >
          {o.icon && <o.icon size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SurfaceCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-(--color-border) bg-(--color-surface)", className)}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[16px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)">
      {children}
    </h2>
  )
}

function Sparkline({ points, tone }: { points: number[]; tone: Tone }) {
  const w = 160
  const h = 40
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = points.length > 1 ? w / (points.length - 1) : 0
  const coords = points.map((p, i) => [i * step, h - 4 - ((p - min) / range) * (h - 8)])
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ")
  const area = `${line} L ${w} ${h} L 0 ${h} Z`
  const color = TONE_VAR[tone]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" preserveAspectRatio="none">
      <path d={area} fill={color} fillOpacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function ProgressBar({ percent, target, tone }: { percent: number; target?: number; tone: Tone }) {
  return (
    <div className="relative h-2 w-full rounded-full bg-(--color-surface-raised)">
      <div className="h-full rounded-full" style={{ width: `${clampPct(percent)}%`, backgroundColor: TONE_VAR[tone] }} />
      {target != null && (
        <div
          className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded bg-(--color-text-secondary)"
          style={{ left: `${clampPct(target)}%` }}
          title="Meta"
        />
      )}
    </div>
  )
}

function CompareBars({
  a,
  b,
}: {
  a: { label: string; percent: number; tone: Tone }
  b: { label: string; percent: number; tone: Tone }
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {[a, b].map((row, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-[11px] text-(--color-text-secondary)">{row.label}</span>
          <div className="h-2 flex-1 rounded-full bg-(--color-surface-raised)">
            <div className="h-full rounded-full" style={{ width: `${clampPct(row.percent)}%`, backgroundColor: TONE_VAR[row.tone] }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ metric }: { metric: Metric }) {
  const { viz } = metric
  return (
    <SurfaceCard className="flex h-full flex-col p-5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)">
        {metric.title}
      </span>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[24px] font-semibold leading-none tracking-[-0.48px] text-(--color-text-primary) font-(family-name:--font-data)">
          {metric.value}
        </p>
        {viz.kind === "spark" && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              viz.deltaPositive
                ? "bg-(--color-success)/15 text-(--color-success)"
                : "bg-(--color-danger)/15 text-(--color-danger)"
            )}
          >
            {viz.deltaPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {viz.delta}
          </span>
        )}
      </div>

      <div className="mt-4">
        {viz.kind === "progress" && <ProgressBar percent={viz.percent} target={viz.target} tone={viz.tone} />}
        {viz.kind === "spark" && <Sparkline points={viz.points} tone={viz.tone} />}
        {viz.kind === "compare" && <CompareBars a={viz.a} b={viz.b} />}
      </div>
      {viz.kind === "progress" && viz.caption && (
        <p className="mt-2 text-[11px] text-(--color-text-secondary)">{viz.caption}</p>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-(--color-text-secondary)">{metric.description}</p>
    </SurfaceCard>
  )
}

function SalesTable({ data }: { data: TopSale[] }) {
  return (
    <div className="px-2">
      <Table>
        <TableHeader>
          <TableRow className="border-(--color-border) hover:bg-transparent">
            {["Item", "Cód. Barras", "Vendas", "Faturamento"].map((h, i) => (
              <TableHead
                key={h}
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)",
                  i >= 2 && "text-right"
                )}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.code} className="border-(--color-border) hover:bg-(--color-surface-raised)/50">
              <TableCell className="text-[14px] font-medium text-(--color-text-primary) font-(family-name:--font-data)">
                {row.item}
              </TableCell>
              <TableCell className="font-mono text-[13px] text-(--color-text-secondary)">{row.code}</TableCell>
              <TableCell className="text-right text-[14px] text-(--color-text-primary) font-(family-name:--font-data)">
                {row.sales}
              </TableCell>
              <TableCell className="text-right text-[14px] font-medium text-(--color-success) font-(family-name:--font-data)">
                {formatCurrency(row.revenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function InteligenciaPage() {
  const [segment, setSegment] = useState<Segment>("produto")
  const [period, setPeriod] = useState<Period>("mensal")
  const [reportState, setReportState] = useState<"idle" | "loading" | "ready">("idle")

  function handleGenerateReport() {
    setReportState("loading")
    window.setTimeout(() => setReportState("ready"), 1400)
  }

  return (
    <div>
      <PageHeader
        title="Inteligência"
        subtitle="Painel estratégico de performance de vendas de produtos e serviços"
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Segmented
          options={[
            { value: "produto", label: "Produtos" },
            { value: "servico", label: "Serviços" },
          ]}
          value={segment}
          onChange={setSegment}
        />
        <div className="flex items-center gap-3">
          <Segmented
            options={[
              { value: "mensal", label: "Mensal" },
              { value: "trimestral", label: "Trimestral" },
            ]}
            value={period}
            onChange={setPeriod}
          />
          <Button
            className="gap-2 bg-(--color-accent) text-white"
            onClick={handleGenerateReport}
            disabled={reportState === "loading"}
          >
            {reportState === "loading" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {reportState === "loading" ? "Gerando..." : "Gerar Relatório de IA"}
          </Button>
        </div>
      </div>

      {reportState !== "idle" && (
        <SurfaceCard className="mb-6 overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-(--color-border) bg-(--color-surface-raised) px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-(--color-accent)">
                <Sparkles size={16} />
              </span>
              <div>
                <CardTitle>Relatório de IA</CardTitle>
                <p className="text-[11px] text-(--color-text-secondary)">
                  Análise gerada automaticamente a partir dos dados do período
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {reportState === "ready" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-(--color-text-secondary) border-(--color-border)"
                  onClick={handleGenerateReport}
                >
                  <RefreshCw size={13} />
                  Regenerar
                </Button>
              )}
              <button
                onClick={() => setReportState("idle")}
                className="flex items-center justify-center rounded p-1 text-(--color-text-secondary) hover:bg-(--color-surface) hover:text-(--color-text-primary) transition-colors"
                title="Fechar relatório"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-5">
            {reportState === "loading" ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5 text-[13px] text-(--color-text-secondary)">
                  <Loader2 size={16} className="animate-spin text-(--color-accent)" />
                  Analisando os dados do período e gerando recomendações...
                </div>
                <div className="flex flex-col gap-2">
                  {[80, 95, 70].map((w) => (
                    <div key={w} className="h-3 animate-pulse rounded bg-(--color-surface-raised)" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex max-w-3xl flex-col gap-5">
                {REPORT.map((section) => (
                  <div key={section.title}>
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-(--color-text-primary)">
                      <section.icon size={14} className={section.iconClass} />
                      {section.title}
                    </h3>
                    {section.intro && (
                      <p className="text-[13px] leading-relaxed text-(--color-text-secondary)">{section.intro}</p>
                    )}
                    {section.bullets && (
                      <ul className="mt-1 flex flex-col gap-1.5">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-2 text-[13px] leading-relaxed text-(--color-text-secondary)">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-(--color-text-secondary)" />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                <p className="border-t border-(--color-border) pt-3 text-[11px] text-(--color-text-secondary)">
                  Relatório gerado automaticamente com base nos dados do mês atual. As recomendações são sugestões e devem ser validadas antes da execução.
                </p>
              </div>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <SurfaceCard key={kpi.label} className="p-5">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)">
                {kpi.label}
              </span>
              <span className={cn("flex size-8 items-center justify-center rounded-lg", kpi.iconClass)}>
                <kpi.icon size={16} />
              </span>
            </div>
            <p className="mt-4 text-[28px] font-semibold leading-none tracking-[-0.56px] text-(--color-text-primary) font-(family-name:--font-data)">
              {kpi.value}
            </p>
            <p className={cn("mt-2 text-[12px] font-medium", kpi.hintClass ?? "text-(--color-text-secondary)")}>
              {kpi.hint}
            </p>
          </SurfaceCard>
        ))}
      </div>

      {/* Projeção de Faturamento + Sazonalidades */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SurfaceCard className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-(--color-accent)" />
            <div>
              <CardTitle>Projeção de Faturamento</CardTitle>
              <p className="text-[12px] text-(--color-text-secondary)">
                Previsão baseada no algoritmo atual (próximos 3 meses)
              </p>
            </div>
          </div>
          <RevenueForecastChart data={FORECAST} />
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <CardTitle>Sazonalidades Identificadas</CardTitle>
          <p className="mb-4 text-[12px] text-(--color-text-secondary)">Padrões sazonais para ajustar a curva preditiva</p>
          <div className="flex flex-col gap-2.5">
            {SEASONALITIES.map((s) => (
              <div key={s.title} className="flex items-center justify-between gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-(--color-text-primary)">{s.title}</span>
                    <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase text-(--color-accent)">
                      Prev IA
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-(--color-text-secondary)">{s.detail}</p>
                </div>
                <span className="shrink-0 text-[14px] font-semibold text-(--color-success)">{s.impact}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      {/* Promoções + Sugestões de Reposição */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SurfaceCard className="p-5">
          <CardTitle>Promoções Estruturadas</CardTitle>
          <p className="mb-4 text-[12px] text-(--color-text-secondary)">Sugestões para itens de baixo giro</p>
          <div className="flex flex-col gap-3">
            {PROMOS.map((promo) => (
              <div key={promo.title} className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-(--color-text-primary)">{promo.title}</span>
                  <span className="shrink-0 rounded-md bg-(--color-warning)/15 px-2 py-0.5 text-[10px] font-medium uppercase text-(--color-warning)">
                    Baixo giro
                  </span>
                </div>
                <p className="text-[11px] text-(--color-text-secondary)">{promo.subtitle}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-(--color-text-secondary)">{promo.description}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <CardTitle>Sugestões de Reposição</CardTitle>
          <p className="mb-4 text-[12px] text-(--color-text-secondary)">Itens de alto giro perto do estoque mínimo</p>
          <div className="flex flex-col gap-3">
            {REPLENISHMENTS.map((item) => (
              <div key={item.product} className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-(--color-text-primary)">{item.product}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase",
                      item.urgency === "alta"
                        ? "bg-(--color-danger)/15 text-(--color-danger)"
                        : "bg-(--color-warning)/15 text-(--color-warning)"
                    )}
                  >
                    {item.urgency === "alta" ? "Urgente" : "Repor"}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-(--color-text-secondary)">{item.reason}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-(--color-success)">
                  <PackagePlus size={13} />
                  {item.suggestedQty}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      {/* Maiores / Menores Vendas */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <h2 className="text-[18px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)">
          Ranking de Vendas
        </h2>
        <Segmented
          options={[
            { value: "produto", label: "Produto" },
            { value: "servico", label: "Serviço" },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SurfaceCard className="overflow-hidden">
          <div className="border-b border-(--color-border) bg-(--color-surface-raised) px-5 py-3.5">
            <CardTitle>
              Maiores Vendas de {segment === "produto" ? "Produtos" : "Serviços"} no Mês
            </CardTitle>
          </div>
          <SalesTable data={TOP_SALES[segment]} />
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden">
          <div className="border-b border-(--color-border) bg-(--color-surface-raised) px-5 py-3.5">
            <CardTitle>
              Menores Vendas de {segment === "produto" ? "Produtos" : "Serviços"} no Mês
            </CardTitle>
          </div>
          <SalesTable data={LOW_SALES[segment]} />
        </SurfaceCard>
      </div>

      {/* Análises avançadas */}
      <div className="mt-8 flex flex-col gap-8">
        {ANALYSES.map((analysis) => (
          <section key={analysis.section}>
            <div className="mb-3 flex items-center gap-2">
              <analysis.icon size={16} className="text-(--color-text-secondary)" />
              <h2 className="text-[18px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)">
                {analysis.section}
              </h2>
            </div>
            <div
              className={cn(
                "grid grid-cols-1 gap-4 sm:grid-cols-2",
                analysis.metrics.length >= 4
                  ? "lg:grid-cols-4"
                  : analysis.metrics.length === 3
                    ? "lg:grid-cols-3"
                    : "lg:grid-cols-2"
              )}
            >
              {analysis.metrics.map((metric) => (
                <MetricCard key={metric.title} metric={metric} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
