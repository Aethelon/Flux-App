"use client"

import { create } from "zustand"
import { api } from "@/lib/api"
import type { Product } from "@/types/product"

interface ApiProduct {
  id: string
  barcode: string | null
  type: Product["type"]
  name: string
  description: string
  active: boolean
  minimumStock: number
  priceCents: number
  costCents: number | null
  category: { id: string; name: string }
  unit: { id: string; abbreviation: string }
  version: number
  updatedAt: string
}

interface ApiBalance {
  product: { id: string }
  onHand: number
  status: "inactive" | "sold_out" | "low_stock" | "available"
  updatedAt: string
}

function product(value: ApiProduct, balance?: ApiBalance): Product {
  const status = value.type === "service" || balance?.status === "available"
    ? "Ativo"
    : balance?.status === "low_stock"
      ? "Baixo estoque"
      : "Esgotado"
  return {
    id: value.id,
    type: value.type,
    name: value.name,
    description: value.description,
    barcode: value.barcode ?? "",
    category: value.category.name,
    categoryId: value.category.id,
    unit: value.unit.abbreviation,
    unitId: value.unit.id,
    price: value.priceCents / 100,
    cost: value.costCents === null ? null : value.costCents / 100,
    stock: balance?.onHand ?? 0,
    minStock: value.minimumStock,
    active: value.active,
    status,
    lastUpdate: `Atualizado em ${new Date(
      balance?.updatedAt ?? value.updatedAt,
    ).toLocaleString("pt-BR")}`,
    version: value.version,
  }
}

interface ProductsStore {
  products: Product[]
  loadProducts: () => Promise<void>
}

export const useProductsStore = create<ProductsStore>((set) => ({
  products: [],
  loadProducts: async () => {
    const [catalog, inventory] = await Promise.all([
      api.get("products", { searchParams: { pageSize: 100 } })
        .json<{ data: ApiProduct[] }>(),
      api.get("inventory/balances", { searchParams: { pageSize: 100 } })
        .json<{ data: ApiBalance[] }>(),
    ])
    const balances = new Map(inventory.data.map((item) => [item.product.id, item]))
    set({ products: catalog.data.map((item) => product(item, balances.get(item.id))) })
  },
}))
