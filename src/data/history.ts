import type { HistoryEntry } from "@/types/history"

// Compras registradas — fonte compartilhada entre o Histórico (listagem e
// KPIs) e o Dashboard (Total Faturamento = vendas da Frente de Caixa +
// serviços). Numa integração real ambas consumiriam a mesma API.
//
// Numeração única e cronológica: um só caixa emite a sequência, então o número
// cresce com a data (131 é o mais antigo, 149 o mais recente). O tipo fica em
// cada item (venda mista aparece nas duas abas — ex.: Nº149). Serviços vêm do
// catálogo (Bordado, Ajuste, Entrega, Embalagem) ou de ordens já concluídas no
// board de Ordens (Pintura Residencial e Limpeza Pós-Obra, pagas na conclusão).
export const INITIAL_HISTORY: HistoryEntry[] = [
  { id: "1",  orderNumber: 149, clientName: "Lucas Teixeira",  phone: "(51) 99123-4567", date: "Hoje",         discount: 0,  payments: [ { kind: "pix", amount: 234.90 } ],
    items: [ { name: "Jogo de Cama Casal", quantity: 1, total: 189.90, type: "produto" }, { name: "Bordado Personalizado", quantity: 1, total: 45.00, type: "servico" } ] },
  { id: "2",  orderNumber: 148, clientName: "Ana Silva",       phone: "(11) 98765-4321", date: "Hoje",         discount: 0,  payments: [ { kind: "pix", amount: 770.00 } ],
    items: [ { name: "Fone de Ouvido Bluetooth", quantity: 1, total: 450.00, type: "produto" }, { name: "Caixa de Som Portátil", quantity: 1, total: 320.00, type: "produto" } ] },
  { id: "3",  orderNumber: 147, clientName: "Carlos Oliveira", phone: "(21) 99988-7766", date: "Hoje",         discount: 20, payments: [ { kind: "cartao", amount: 1230.00, cardType: "credito", installments: 3 } ],
    items: [ { name: "Câmera de Segurança 1080p", quantity: 1, total: 1250.00, type: "produto" } ] },
  { id: "4",  orderNumber: 146, clientName: "Ana Silva",       phone: "(11) 98765-4321", date: "Hoje",         discount: 0,  payments: [ { kind: "pix", amount: 35.00 } ],
    items: [ { name: "Ajuste de Medidas", quantity: 1, total: 35.00, type: "servico" } ] },
  { id: "5",  orderNumber: 145, clientName: "Julia Santos",    phone: "(41) 93344-5566", date: "Ontem",        discount: 0,  payments: [ { kind: "dinheiro", amount: 229.70 } ],
    items: [ { name: "Luminária de Mesa LED", quantity: 2, total: 159.80, type: "produto" }, { name: "Manta de Microfibra", quantity: 1, total: 69.90, type: "produto" } ] },
  { id: "6",  orderNumber: 144, clientName: "Rafael Ribeiro",  phone: "(41) 98855-2211", date: "Ontem",        discount: 0,  payments: [ { kind: "pix", amount: 899.00 } ],
    items: [ { name: "Relógio Inteligente", quantity: 1, total: 899.00, type: "produto" } ] },
  { id: "7",  orderNumber: 143, clientName: "Bruno Mendes",    phone: "(31) 92233-4455", date: "Ontem",        discount: 0,  payments: [ { kind: "cartao", amount: 270.00, cardType: "credito", installments: 3 } ],
    items: [ { name: "Bordado Personalizado", quantity: 6, total: 270.00, type: "servico" } ] },
  { id: "8",  orderNumber: 142, clientName: "Lucas Teixeira",  phone: "(51) 99123-4567", date: "Ontem",        discount: 15, payments: [ { kind: "cartao", amount: 1435.00, cardType: "debito" } ],
    items: [ { name: "Cadeira Ergonômica", quantity: 1, total: 1450.00, type: "produto" } ] },
  { id: "9",  orderNumber: 141, clientName: "Fernanda Costa",  phone: "(11) 91234-5678", date: "Ontem",        discount: 0,  payments: [ { kind: "dinheiro", amount: 600.00 }, { kind: "pix", amount: 740.00 } ],
    items: [ { name: "Monitor 24\" Full HD", quantity: 1, total: 890.00, type: "produto" }, { name: "Fone de Ouvido Bluetooth", quantity: 1, total: 450.00, type: "produto" } ] },
  { id: "10", orderNumber: 140, clientName: "Bruno Mendes",    phone: "(31) 92233-4455", date: "11 Jul 2026",  discount: 0,  payments: [ { kind: "cartao", amount: 640.00, cardType: "credito", installments: 2 } ],
    items: [ { name: "Caixa de Som Portátil", quantity: 2, total: 640.00, type: "produto" } ] },
  { id: "11", orderNumber: 139, clientName: "Fernanda Costa",  phone: "(11) 91234-5678", date: "Ontem",         discount: 0,  payments: [ { kind: "cartao", amount: 780.00, cardType: "debito" } ],
    items: [ { name: "Pintura Residencial", quantity: 1, total: 780.00, type: "servico" } ] },
  { id: "12", orderNumber: 138, clientName: "Lucas Teixeira",  phone: "(51) 99123-4567", date: "09 Jul 2026",  discount: 0,  payments: [ { kind: "pix", amount: 420.00 } ],
    items: [ { name: "Limpeza Pós-Obra", quantity: 1, total: 420.00, type: "servico" } ] },
  { id: "13", orderNumber: 137, clientName: "Julia Santos",    phone: "(41) 93344-5566", date: "08 Jul 2026",  discount: 0,  payments: [ { kind: "dinheiro", amount: 79.90 } ],
    items: [ { name: "Luminária de Mesa LED", quantity: 1, total: 79.90, type: "produto" } ] },
  { id: "14", orderNumber: 136, clientName: "Pedro Alves",     phone: "(51) 94455-6677", date: "07 Jul 2026",  discount: 30, payments: [ { kind: "cartao", amount: 1500.00, cardType: "credito", installments: 6 }, { kind: "pix", amount: 619.00 } ],
    items: [ { name: "Câmera de Segurança 1080p", quantity: 1, total: 1250.00, type: "produto" }, { name: "Relógio Inteligente", quantity: 1, total: 899.00, type: "produto" } ] },
  { id: "15", orderNumber: 135, clientName: "Pedro Alves",     phone: "(51) 94455-6677", date: "06 Jul 2026",  discount: 0,  payments: [ { kind: "pix", amount: 35.00 } ],
    items: [ { name: "Entrega Expressa", quantity: 1, total: 25.00, type: "servico" }, { name: "Embalagem para Presente", quantity: 1, total: 10.00, type: "servico" } ] },
  { id: "16", orderNumber: 134, clientName: "Camila Rocha",    phone: "(21) 95566-7788", date: "05 Jul 2026",  discount: 0,  payments: [ { kind: "cartao", amount: 119.70, cardType: "debito" } ],
    items: [ { name: "Almofada Decorativa", quantity: 3, total: 119.70, type: "produto" } ] },
  { id: "17", orderNumber: 133, clientName: "Ana Silva",       phone: "(11) 98765-4321", date: "02 Jul 2026",  discount: 0,  payments: [ { kind: "pix", amount: 1450.00 } ],
    items: [ { name: "Cadeira Ergonômica", quantity: 1, total: 1450.00, type: "produto" } ] },
  { id: "18", orderNumber: 132, clientName: "Camila Rocha",    phone: "(21) 95566-7788", date: "30 Jun 2026",  discount: 0,  payments: [ { kind: "pix", amount: 90.00 } ],
    items: [ { name: "Bordado Personalizado", quantity: 2, total: 90.00, type: "servico" } ] },
  { id: "19", orderNumber: 131, clientName: "Carlos Oliveira", phone: "(21) 99988-7766", date: "28 Jun 2026",  discount: 0,  payments: [ { kind: "dinheiro", amount: 399.00 } ],
    items: [ { name: "Teclado Mecânico RGB", quantity: 1, total: 399.00, type: "produto" } ] },
]

// Total da compra: soma dos itens menos o desconto.
export function entryTotal(entry: HistoryEntry): number {
  return entry.items.reduce((sum, i) => sum + i.total, 0) - entry.discount
}

// Faturamento por tipo: soma dos itens de cada tipo, com o desconto da
// compra rateado proporcionalmente entre os itens.
export function revenueByType(
  entries: HistoryEntry[]
): Record<"produto" | "servico", number> {
  const revenue = { produto: 0, servico: 0 }
  for (const entry of entries) {
    const gross = entry.items.reduce((sum, i) => sum + i.total, 0)
    const factor = gross > 0 ? (gross - entry.discount) / gross : 0
    for (const item of entry.items) {
      revenue[item.type] += item.total * factor
    }
  }
  return revenue
}

// Faturamento dos 5 meses anteriores por tipo (mock — virá da API). O 6º
// ponto das séries é o acumulado atual, derivado de INITIAL_HISTORY. O
// Dashboard usa a soma das duas séries (produtos + serviços).
export const REVENUE_TREND: Record<"produto" | "servico", number[]> = {
  produto: [7250, 8140, 9320, 8810, 9930],
  servico: [890, 1040, 1280, 1150, 1420],
}
export const TREND_LABELS = ["Fev", "Mar", "Abr", "Mai", "Jun", "Jul"]
