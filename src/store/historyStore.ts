"use client"

import { create } from "zustand"
import { api } from "@/lib/api"
import { useClientsStore } from "@/store/clientsStore"
import type { HistoryEntry } from "@/types/history"
import type { Payment } from "@/types/payment"

type ApiPaymentMethod = "cash" | "credit" | "debit" | "pix"

interface ApiSale {
  id: string
  businessNumber: number
  status: "completed" | "partially_returned" | "returned" | "cancelled"
  customer: { id: string; name: string } | null
  grossAmountCents: number
  discountAmountCents: number
  netAmountCents: number
  returnedAmountCents: number
  completedAt: string
  items: Array<{
    productName: string
    productType: "raw_material" | "finished_product" | "packaging" | "service"
    quantity: number
    grossAmountCents: number
  }>
  payments: Array<{
    method: ApiPaymentMethod
    effectiveAmountCents: number
    installments: number | null
  }>
}

export interface HistoryKpis {
  netRevenueCents: number
  completedSaleCount: number
  averageTicketCents: number | null
}

export interface HistorySearchRecord {
  id: string
  businessNumber: number
  customerName: string
  completedAt: string
  itemNames: string[]
}

function payment(value: ApiSale["payments"][number]): Payment {
  if (value.method === "credit") {
    return {
      kind: "cartao",
      cardType: "credito",
      amount: value.effectiveAmountCents / 100,
      installments: value.installments ?? 1,
    }
  }
  if (value.method === "debit") {
    return {
      kind: "cartao",
      cardType: "debito",
      amount: value.effectiveAmountCents / 100,
    }
  }
  return {
    kind: value.method === "cash" ? "dinheiro" : "pix",
    amount: value.effectiveAmountCents / 100,
  }
}

function entry(sale: ApiSale): HistoryEntry {
  const clients = useClientsStore.getState().clients
  const customer = sale.customer
  return {
    id: sale.id,
    orderNumber: sale.businessNumber,
    clientName: customer?.name ?? "Consumidor não identificado",
    phone: clients.find((client) => client.id === customer?.id)?.phone ?? "—",
    date: new Date(sale.completedAt).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    completedAt: sale.completedAt,
    netTotal: sale.status === "cancelled"
      ? 0
      : (sale.netAmountCents - sale.returnedAmountCents) / 100,
    returnedAmount: sale.returnedAmountCents / 100,
    items: sale.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      total: item.grossAmountCents / 100,
      type: item.productType === "service" ? "servico" : "produto",
    })),
    discount: sale.discountAmountCents / 100,
    payments: sale.payments.map(payment),
  }
}

export function entryTotal(value: HistoryEntry): number {
  return value.netTotal
}

interface HistoryStore {
  history: HistoryEntry[]
  searchRecords: HistorySearchRecord[]
  kpis: HistoryKpis | null
  loadHistory: (includeKpis?: boolean) => Promise<void>
  loadHistorySearch: () => Promise<void>
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  history: [],
  searchRecords: [],
  kpis: null,
  loadHistory: async (includeKpis = false) => {
    const page = await api.get("history/sales", {
      searchParams: { limit: 100 },
    }).json<{ data: Array<{
      id: string
      businessNumber: number
      customer: { name: string } | null
      completedAt: string
      itemNames: string[]
    }> }>()
    const sales = await Promise.all(
      page.data.map((record) => api.get(`sales/${record.id}`).json<ApiSale>())
    )
    const kpis = includeKpis
      ? await api.get("history/kpis").json<HistoryKpis>()
      : null
    set({
      history: sales.map(entry),
      searchRecords: page.data.map((record) => ({
        id: record.id,
        businessNumber: record.businessNumber,
        customerName: record.customer?.name ?? "Consumidor não identificado",
        completedAt: record.completedAt,
        itemNames: record.itemNames,
      })),
      kpis,
    })
  },
  loadHistorySearch: async () => {
    const page = await api.get("history/sales", {
      searchParams: { limit: 100 },
    }).json<{ data: Array<{
      id: string
      businessNumber: number
      customer: { name: string } | null
      completedAt: string
      itemNames: string[]
    }> }>()
    set({
      searchRecords: page.data.map((record) => ({
        id: record.id,
        businessNumber: record.businessNumber,
        customerName: record.customer?.name ?? "Consumidor não identificado",
        completedAt: record.completedAt,
        itemNames: record.itemNames,
      })),
    })
  },
}))
