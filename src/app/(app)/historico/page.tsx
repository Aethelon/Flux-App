"use client"

import { useEffect, useState } from "react"
import { Download, Eye, X, QrCode, CreditCard, Banknote } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { HistoryEntry } from "@/types/history"
import { describePayment, type PaymentKind } from "@/types/payment"

const INITIAL_HISTORY: HistoryEntry[] = [
  { id: "1",  orderNumber: 142, clientName: "Ana Silva",       phone: "(11) 98765-4321", date: "Hoje",         type: "produto", discount: 0,  payments: [ { kind: "pix", amount: 770.00 } ],
    items: [ { name: "Fone de Ouvido Bluetooth", quantity: 1, total: 450.00 }, { name: "Caixa de Som Portátil", quantity: 1, total: 320.00 } ] },
  { id: "2",  orderNumber: 141, clientName: "Carlos Oliveira", phone: "(21) 99988-7766", date: "Hoje",         type: "produto", discount: 20, payments: [ { kind: "cartao", amount: 1230.00, cardType: "credito", installments: 3 } ],
    items: [ { name: "Câmera de Segurança 1080p", quantity: 1, total: 1250.00 } ] },
  { id: "3",  orderNumber: 140, clientName: "Mariana Pereira", phone: "(31) 97766-5544", date: "Hoje",         type: "produto", discount: 0,  payments: [ { kind: "dinheiro", amount: 219.70 } ],
    items: [ { name: "Luminária de Mesa LED", quantity: 2, total: 159.80 }, { name: "Garrafa Térmica 1L", quantity: 1, total: 59.90 } ] },
  { id: "4",  orderNumber: 139, clientName: "Rafael Ribeiro",  phone: "(41) 98855-2211", date: "Ontem",        type: "produto", discount: 0,  payments: [ { kind: "pix", amount: 899.00 } ],
    items: [ { name: "Relógio Inteligente", quantity: 1, total: 899.00 } ] },
  { id: "5",  orderNumber: 138, clientName: "Lucas Teixeira",  phone: "(51) 99123-4567", date: "Ontem",        type: "produto", discount: 15, payments: [ { kind: "cartao", amount: 1435.00, cardType: "debito" } ],
    items: [ { name: "Cadeira Ergonômica", quantity: 1, total: 1450.00 } ] },
  { id: "6",  orderNumber: 137, clientName: "Fernanda Costa",  phone: "(11) 91234-5678", date: "Ontem",        type: "produto", discount: 0,  payments: [ { kind: "dinheiro", amount: 400.00 }, { kind: "pix", amount: 449.00 } ],
    items: [ { name: "Teclado Mecânico RGB", quantity: 1, total: 399.00 }, { name: "Fone de Ouvido Bluetooth", quantity: 1, total: 450.00 } ] },
  { id: "7",  orderNumber: 136, clientName: "Bruno Mendes",    phone: "(31) 92233-4455", date: "17 Mar 2026",  type: "produto", discount: 0,  payments: [ { kind: "cartao", amount: 640.00, cardType: "credito", installments: 2 } ],
    items: [ { name: "Caixa de Som Portátil", quantity: 2, total: 640.00 } ] },
  { id: "8",  orderNumber: 135, clientName: "Julia Santos",    phone: "(41) 93344-5566", date: "17 Mar 2026",  type: "produto", discount: 0,  payments: [ { kind: "dinheiro", amount: 79.90 } ],
    items: [ { name: "Luminária de Mesa LED", quantity: 1, total: 79.90 } ] },
  { id: "9",  orderNumber: 134, clientName: "Pedro Alves",     phone: "(51) 94455-6677", date: "17 Mar 2026",  type: "produto", discount: 30, payments: [ { kind: "cartao", amount: 1500.00, cardType: "credito", installments: 6 }, { kind: "pix", amount: 619.00 } ],
    items: [ { name: "Câmera de Segurança 1080p", quantity: 1, total: 1250.00 }, { name: "Relógio Inteligente", quantity: 1, total: 899.00 } ] },
  { id: "10", orderNumber: 133, clientName: "Camila Rocha",    phone: "(21) 95566-7788", date: "16 Mar 2026",  type: "produto", discount: 0,  payments: [ { kind: "cartao", amount: 179.70, cardType: "debito" } ],
    items: [ { name: "Garrafa Térmica 1L", quantity: 3, total: 179.70 } ] },
  { id: "11", orderNumber: 132, clientName: "Ana Silva",       phone: "(11) 98765-4321", date: "15 Mar 2026",  type: "produto", discount: 0,  payments: [ { kind: "pix", amount: 1450.00 } ],
    items: [ { name: "Cadeira Ergonômica", quantity: 1, total: 1450.00 } ] },
  { id: "12", orderNumber: 131, clientName: "Carlos Oliveira", phone: "(21) 99988-7766", date: "10 Mar 2026",  type: "produto", discount: 0,  payments: [ { kind: "dinheiro", amount: 399.00 } ],
    items: [ { name: "Teclado Mecânico RGB", quantity: 1, total: 399.00 } ] },
  { id: "13", orderNumber: 209, clientName: "Ana Silva",       phone: "(11) 98765-4321", date: "Hoje",         type: "servico", discount: 0,  payments: [ { kind: "pix", amount: 280.00 } ],
    items: [ { name: "Manutenção de Ar Condicionado", quantity: 1, total: 280.00 } ] },
  { id: "14", orderNumber: 208, clientName: "Bruno Mendes",    phone: "(31) 92233-4455", date: "Ontem",        type: "servico", discount: 0,  payments: [ { kind: "cartao", amount: 350.00, cardType: "credito", installments: 3 } ],
    items: [ { name: "Instalação Elétrica", quantity: 1, total: 350.00 } ] },
  { id: "15", orderNumber: 207, clientName: "Julia Santos",    phone: "(41) 93344-5566", date: "Ontem",        type: "servico", discount: 0,  payments: [ { kind: "dinheiro", amount: 190.00 } ],
    items: [ { name: "Conserto de Máquina de Lavar", quantity: 1, total: 190.00 } ] },
  { id: "16", orderNumber: 206, clientName: "Pedro Alves",     phone: "(51) 94455-6677", date: "17 Mar 2026",  type: "servico", discount: 10, payments: [ { kind: "pix", amount: 210.00 } ],
    items: [ { name: "Montagem de Móveis", quantity: 1, total: 220.00 } ] },
  { id: "17", orderNumber: 205, clientName: "Camila Rocha",    phone: "(21) 95566-7788", date: "16 Mar 2026",  type: "servico", discount: 0,  payments: [ { kind: "cartao", amount: 780.00, cardType: "debito" } ],
    items: [ { name: "Pintura Residencial", quantity: 1, total: 780.00 } ] },
  { id: "18", orderNumber: 204, clientName: "Fernanda Costa",  phone: "(11) 91234-5678", date: "15 Mar 2026",  type: "servico", discount: 0,  payments: [ { kind: "pix", amount: 420.00 } ],
    items: [ { name: "Limpeza Pós-Obra", quantity: 1, total: 420.00 } ] },
]

const TABS = [
  { value: "produto", label: "Produtos" },
  { value: "servico", label: "Serviços" },
]

const PAYMENT_ICONS: Record<PaymentKind, typeof QrCode> = {
  pix: QrCode,
  cartao: CreditCard,
  dinheiro: Banknote,
}

const PER_PAGE = 10

export default function HistoricoPage() {
  const [history] = useState<HistoryEntry[]>(INITIAL_HISTORY)
  const [tab, setTab] = useState("produto")
  const [page, setPage] = useState(1)
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
  const [panelVisible, setPanelVisible] = useState(false)

  const filtered = history.filter((h) => h.type === tab)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => {
    if (!selectedEntry) return
    const raf = requestAnimationFrame(() => setPanelVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [selectedEntry])

  function toggleView(entry: HistoryEntry) {
    if (selectedEntry?.id === entry.id && panelVisible) {
      closePanel()
    } else {
      setSelectedEntry(entry)
    }
  }

  function closePanel() {
    setPanelVisible(false)
  }

  const subtotal = selectedEntry ? selectedEntry.items.reduce((sum, i) => sum + i.total, 0) : 0
  const total = subtotal - (selectedEntry?.discount ?? 0)

  const columns: Column<HistoryEntry>[] = [
    {
      key: "orderNumber",
      label: "Nº da Compra",
      render: (row) => <span className="font-medium">{row.orderNumber}</span>,
    },
    { key: "clientName", label: "Cliente" },
    { key: "phone", label: "Telefone" },
    {
      key: "view",
      label: "Compra",
      render: (row) => {
        const active = selectedEntry?.id === row.id && panelVisible
        return (
          <button
            onClick={() => toggleView(row)}
            className={cn(
              "p-1.5 rounded transition-colors",
              active
                ? "bg-primary/15 text-(--color-accent)"
                : "hover:bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary)"
            )}
            title={active ? "Fechar visualização" : "Ver compra"}
          >
            <Eye size={16} />
          </button>
        )
      },
    },
    { key: "date", label: "Última Compra" },
  ]

  return (
    <div>
      <PageHeader
        title="Histórico"
        subtitle="Gerencie sua base de histórico de compras e vendas de serviços"
      />

      <div className="flex items-stretch gap-4">
        <div className="min-w-0 flex-1">
          <DataTable
            columns={columns}
            data={paginated}
            keyField="id"
            tabs={TABS}
            activeTab={tab}
            onTabChange={(t) => { setTab(t); setPage(1) }}
            actions={
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-(--color-text-secondary) border-(--color-border)"
              >
                <Download size={14} />
                Exportar
              </Button>
            }
            pagination={{
              page,
              total: filtered.length,
              perPage: PER_PAGE,
              onChange: setPage,
            }}
          />
        </div>

        {selectedEntry && (
          <div
            className={cn(
              "shrink-0 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) transition-all duration-200 ease-out",
              panelVisible ? "w-80 opacity-100" : "w-0 opacity-0"
            )}
            onTransitionEnd={(e) => {
              if (e.propertyName === "width" && !panelVisible) {
                setSelectedEntry(null)
              }
            }}
          >
            <div className="flex w-80 items-center justify-end p-3">
              <button
                onClick={closePanel}
                className="p-1 rounded hover:bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex w-80 flex-col gap-5 px-5 pb-5">
              <h3 className="text-center text-[18px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)">
                Compra Nº{selectedEntry.orderNumber}
              </h3>

              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-(--color-text-secondary)">
                  Itens da Compra
                </span>
                <div className="flex max-h-56 flex-col gap-2.5 overflow-y-auto">
                  {selectedEntry.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="text-(--color-text-primary)">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="shrink-0 text-(--color-text-secondary)">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-(--color-border) pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-(--color-text-secondary)">
                  Detalhes
                </span>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-(--color-text-secondary)">Subtotal</span>
                  <span className="text-(--color-text-primary)">{formatCurrency(subtotal)}</span>
                </div>
                {selectedEntry.discount > 0 && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-(--color-text-secondary)">Desconto</span>
                    <span className="text-(--color-danger)">
                      -{formatCurrency(selectedEntry.discount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <span className="text-(--color-text-primary)">Total</span>
                  <span className="text-(--color-text-primary)">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-(--color-border) pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-(--color-text-secondary)">
                  Forma de Pagamento
                </span>
                <div className="flex flex-col gap-2">
                  {selectedEntry.payments.map((p, i) => {
                    const PaymentIcon = PAYMENT_ICONS[p.kind]
                    const showInstallments =
                      p.kind === "cartao" && p.cardType === "credito" && (p.installments ?? 1) > 1
                    return (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-(--color-bg)">
                          <PaymentIcon size={14} />
                          {describePayment(p)}
                        </span>
                        <span className="text-right text-[13px] text-(--color-text-primary)">
                          {formatCurrency(p.amount)}
                          {showInstallments && (
                            <span className="block text-[11px] text-(--color-text-secondary)">
                              {p.installments}x de {formatCurrency(p.amount / (p.installments ?? 1))}
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
