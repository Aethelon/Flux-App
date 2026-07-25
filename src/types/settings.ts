export interface Unit {
  id: string
  name: string
  abbreviation: string
  allowsFractional: boolean
  quantityScale: number
  version: number
}

export interface Category {
  id: string
  name: string
  version: number
}
