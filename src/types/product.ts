export interface Product {
  id: string
  type: "raw_material" | "finished_product" | "packaging" | "service"
  name: string
  description: string
  barcode: string
  category: string
  categoryId: string
  unit: string
  unitId: string
  quantityScale: number
  price: number
  cost: number | null
  stock: number
  minStock: number
  active: boolean
  status: "Ativo" | "Baixo estoque" | "Esgotado" | "Inativo"
  version: number
  lastUpdate: string
}
