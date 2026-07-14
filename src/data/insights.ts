// Insights de IA compartilhados entre a Inteligência (onde são detalhados) e o
// Dashboard (que exibe um resumo). Fonte única para não divergirem.

export interface Seasonality {
  title: string
  detail: string
  impact: string
}

export const SEASONALITIES: Seasonality[] = [
  { title: "Dia das Mães",          detail: "Pico de enxovais",                   impact: "+50%" },
  { title: "Festa Junina",          detail: "Alta procura por trajes e retalhos", impact: "+25%" },
  { title: "Black Friday",          detail: "Sexta de promoções de enxovais",     impact: "+160%" },
  { title: "Dezembro e fim de ano", detail: "Pico de enxovais para festas",       impact: "+90%" },
]
