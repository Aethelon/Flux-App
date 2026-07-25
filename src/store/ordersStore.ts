"use client"

import { create } from "zustand"
import { api } from "@/lib/api"
import type { KanbanColumn, Order, OrderPriority } from "@/types/order"

interface ApiColumn {
  id: string
  label: string
  semanticType: "open" | "completed" | "cancelled"
  colorToken: string
  displayPosition: number
  protected: boolean
  version: number
}

interface ApiOrder {
  id: string
  businessNumber: number
  customer: { id: string; name: string }
  title: string
  description: string
  priority: "low" | "medium" | "high"
  dueAt: string | null
  estimatedValueCents: number
  column: ApiColumn
  status: "open" | "completed" | "cancelled"
  completedAt: string | null
  version: number
}

function priority(value: ApiOrder["priority"]): OrderPriority {
  if (value === "low") return "baixa"
  if (value === "high") return "alta"
  return "média"
}

export function orderPriority(value: OrderPriority): ApiOrder["priority"] {
  if (value === "baixa") return "low"
  if (value === "alta") return "high"
  return "medium"
}

function column(value: ApiColumn): KanbanColumn {
  return {
    id: value.id,
    label: value.label,
    color: value.colorToken,
    semanticType: value.semanticType,
    displayPosition: value.displayPosition,
    protected: value.protected,
    version: value.version,
  }
}

function order(value: ApiOrder): Order {
  return {
    id: value.id,
    businessNumber: value.businessNumber,
    columnId: value.column.id,
    customerId: value.customer.id,
    title: value.title,
    description: value.description,
    client: value.customer.name,
    value: value.estimatedValueCents / 100,
    priority: priority(value.priority),
    dueAt: value.dueAt?.slice(0, 10) ?? "",
    status: value.status,
    version: value.version,
    ...(value.completedAt ? { completedAt: value.completedAt } : {}),
  }
}

type Update<T> = T[] | ((previous: T[]) => T[])

interface OrdersStore {
  columns: KanbanColumn[]
  orders: Order[]
  setColumns: (update: Update<KanbanColumn>) => void
  setOrders: (update: Update<Order>) => void
  loadOrders: () => Promise<void>
}

export const useOrdersStore = create<OrdersStore>((set) => ({
  columns: [],
  orders: [],
  setColumns: (update) => set((state) => ({
    columns: typeof update === "function" ? update(state.columns) : update,
  })),
  setOrders: (update) => set((state) => ({
    orders: typeof update === "function" ? update(state.orders) : update,
  })),
  loadOrders: async () => {
    const [columns, orders] = await Promise.all([
      api.get("service-order-columns").json<ApiColumn[]>(),
      api.get("service-orders", {
        searchParams: { view: "board" },
      }).json<ApiOrder[]>(),
    ])
    set({
      columns: columns.map(column),
      orders: orders.map(order),
    })
  },
}))
