"use client"

import { create } from "zustand"
import { fetchAllPages } from "@/lib/api"
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
  unit: { id: string; abbreviation: string; quantityScale: number }
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
  const status = !value.active
    ? "Inativo"
    : value.type === "service" || balance?.status === "available"
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
    quantityScale: value.unit.quantityScale,
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
      fetchAllPages<ApiProduct>("products"),
      fetchAllPages<ApiBalance>("inventory/balances"),
    ])
    const balances = new Map(inventory.map((item) => [item.product.id, item]))
    set({ products: catalog.map((item) => product(item, balances.get(item.id))) })
  },
}))
