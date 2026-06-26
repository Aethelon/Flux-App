export interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
  status: "Ativo" | "Baixo estoque" | "Esgotado"
}
