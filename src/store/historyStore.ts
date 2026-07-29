"use client"

import { create } from "zustand"
import { api } from "@/lib/api"
import { useClientsStore } from "@/store/clientsStore"
import type { HistoryEntry } from "@/types/history"
import type { Payment } from "@/types/payment"

type ApiPaymentMethod = "cash" | "credit" | "debit" | "pix"

interface ApiHistorySale {
  id: string
  businessNumber: number
  status: "completed" | "partially_returned" | "returned" | "cancelled"
  customer: { id: string; name: string } | null
  completedAt: string
  itemNames: string[]
  details?: {
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
  financial?: {
    discountAmountCents: number
    returnedAmountCents: number
    netRevenueCents: number
  }
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

function payment(value: NonNullable<ApiHistorySale["details"]>["payments"][number]): Payment {
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

function entry(sale: ApiHistorySale): HistoryEntry {
  const clients = useClientsStore.getState().clients
  const customer = sale.customer
  const details = sale.details
  const financial = sale.financial
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
    netTotal: sale.status === "cancelled" ? 0 : (financial?.netRevenueCents ?? 0) / 100,
    returnedAmount: (financial?.returnedAmountCents ?? 0) / 100,
    items: (details?.items ?? []).map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      total: item.grossAmountCents / 100,
      type: item.productType === "service" ? "servico" : "produto",
    })),
    discount: (financial?.discountAmountCents ?? 0) / 100,
    payments: (details?.payments ?? []).map(payment),
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
    }).json<{ data: ApiHistorySale[] }>()
    const kpis = includeKpis
      ? await api.get("history/kpis").json<HistoryKpis>()
      : null
    set({
      history: page.data.map(entry),
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
