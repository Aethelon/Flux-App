"use client"

import { useEffect, useState } from "react"
import { Download, Eye, X, QrCode, CreditCard, Banknote } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { HistoryEntry } from "@/types/history"
import { describePayment, type PaymentKind } from "@/types/payment"
import { useUserStore } from "@/store/userStore"
import { entryTotal, useHistoryStore } from "@/store/historyStore"
import { useClientsStore } from "@/store/clientsStore"
import { api, idempotencyHeaders } from "@/lib/api"

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
  const isAdmin = useUserStore((s) => s.user?.role === "admin")
  const history = useHistoryStore((state) => state.history)
  const loadHistory = useHistoryStore((state) => state.loadHistory)
  const kpis = useHistoryStore((state) => state.kpis)
  const loadClients = useClientsStore((state) => state.loadClients)
  const [tab, setTab] = useState("produto")
  const [page, setPage] = useState(1)
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
  const [panelVisible, setPanelVisible] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    void loadClients()
      .then(() => loadHistory(isAdmin))
      .catch(() => toast.error("Não foi possível carregar o histórico."))
  }, [isAdmin, loadClients, loadHistory])

  // Filtro por item: uma venda mista (produto + serviço) aparece nas duas abas.
  const filtered = history.filter((h) => h.items.some((i) => i.type === tab))

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

  async function handleExport() {
    setExporting(true)
    try {
      const created = await api.post("exports", {
        headers: idempotencyHeaders(),
        json: { source: "sales_history" },
      }).json<{ id: string }>()
      let completed = false
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const job = await api.get(`exports/${created.id}`).json<{
          status: "pending" | "processing" | "completed" | "failed"
        }>()
        if (job.status === "failed") throw new Error("Export failed")
        if (job.status === "completed") {
          completed = true
          break
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1_000))
      }
      if (!completed) throw new Error("Export timed out")
      const blob = await api.get(`exports/${created.id}/download`).blob()
      const href = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = href
      link.download = `historico-vendas-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(href), 0)
      toast.success("Histórico exportado.")
    } catch {
      toast.error("Não foi possível exportar o histórico.")
    } finally {
      setExporting(false)
    }
  }

  const subtotal = selectedEntry ? selectedEntry.items.reduce((sum, i) => sum + i.total, 0) : 0
  const total = selectedEntry?.netTotal ?? 0

  const columns: Column<HistoryEntry>[] = [
    {
      key: "orderNumber",
      label: "Nº da Compra",
      render: (row) => <span className="font-medium">{row.orderNumber}</span>,
    },
    { key: "clientName", label: "Cliente" },
    { key: "phone", label: "Telefone" },
    {
      key: "total",
      label: "Total",
      render: (row) => <span className="font-medium">{formatCurrency(entryTotal(row))}</span>,
    },
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
    { key: "date", label: "Data" },
  ]

  return (
    <div>
      <PageHeader
        title="Histórico"
        subtitle="Gerencie sua base de histórico de compras e vendas de serviços"
      />

      {isAdmin && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: "Faturamento Líquido", value: (kpis?.netRevenueCents ?? 0) / 100 },
            { label: "Ticket Médio", value: (kpis?.averageTicketCents ?? 0) / 100 },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)">
                  {label}
                </span>
                <span className="text-[24px] font-semibold leading-9 tracking-[-0.48px] text-(--color-text-primary) font-(family-name:--font-data)">
                  {formatCurrency(value)}
                </span>
              </div>
              <span className="text-[12px] text-(--color-text-secondary)">
                Calculado e versionado pelo backend.
              </span>
            </div>
          ))}
        </div>
      )}

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
                disabled={exporting}
                onClick={handleExport}
              >
                <Download size={14} />
                {exporting ? "Exportando..." : "Exportar"}
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
                {selectedEntry.returnedAmount > 0 && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-(--color-text-secondary)">Devoluções</span>
                    <span className="text-(--color-danger)">
                      -{formatCurrency(selectedEntry.returnedAmount)}
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
                        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-(--color-text-primary) px-3 py-1.5 text-[13px] font-medium text-(--color-surface)">
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
