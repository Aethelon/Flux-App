export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function parsePriceInput(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".")
  return Number(normalized) || 0
}

export function formatPriceInput(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCentsInput(value: string, maximum?: number): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) return formatPriceInput(0)

  const amount = Number(digits) / 100
  const normalized = maximum === undefined ? amount : Math.min(maximum, amount)
  return formatPriceInput(normalized)
}

export function formatMoneyInput(value: string): string {
  return formatCentsInput(value)
}

export function formatPercentInput(value: string): string {
  return formatCentsInput(value, 100)
}

export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  const localDigits = (digits.length === 12 || digits.length === 13) && digits.startsWith("55")
    ? digits.slice(2)
    : digits
  return localDigits.slice(0, 11)
}

export function formatPhoneInput(phone: string): string {
  const digits = phoneDigits(phone)
  if (!digits) return ""
  if (digits.length <= 2) return `(${digits}`

  const areaCode = `(${digits.slice(0, 2)}) `
  const number = digits.slice(2)
  const firstPartLength = digits.length <= 10 ? 4 : 5
  const firstPart = number.slice(0, firstPartLength)
  const secondPart = number.slice(firstPartLength)
  return `${areaCode}${firstPart}${secondPart ? `-${secondPart}` : ""}`
}

export function formatPhone(phone: string): string {
  return formatPhoneInput(phone)
}
