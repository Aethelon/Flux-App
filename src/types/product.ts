export interface Product {
  id: string
  name: string
  description: string
  barcode: string
  category: string
  unit: string
  price: number
  stock: number
  minStock: number
  active: boolean
  status: "Ativo" | "Baixo estoque" | "Esgotado"
  lastUpdate: string
}
