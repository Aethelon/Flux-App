"use client"

import { Fragment, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Minus,
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  QrCode,
  ShoppingCart,
  X,
  Check,
  Lock,
  Wallet,
  ArrowLeft,
  ClipboardList,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { ClientCombobox } from "@/components/shared/ClientCombobox"
import { formatCurrency, parsePriceInput } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { describePayment, type Payment } from "@/types/payment"
import type { SaleInput } from "@/types/history"
import { INITIAL_PRODUCTS, isService } from "@/data/products"
import { INITIAL_ORDERS, CLOSED_COLUMN_IDS } from "@/data/orders"
import type { Product } from "@/types/product"
import type { Order } from "@/types/order"
import { useCaixaStore } from "@/store/caixaStore"

// Catálogo vem da mesma fonte do Inventário. A frente de caixa vende itens
// acabados e serviços: matéria-prima não vai ao balcão e itens inativos não
// aparecem para venda.
const CATALOG = INITIAL_PRODUCTS.filter((p) => p.active && p.category !== "Matéria-Prima")

// "Ordens" entra como uma categoria à parte no fim da lista: são ordens de
// serviço ainda em aberto (não encerradas) que podem ser cobradas no balcão.
const ORDERS_CATEGORY = "Ordens"
const CATEGORIES = [
  "Todos",
  ...Array.from(new Set(CATALOG.map((p) => p.category))),
  ORDERS_CATEGORY,
]

// Ordens vendáveis = tudo que ainda não está numa coluna encerrada
// (concluído/cancelado). As concluídas já foram pagas na conclusão e vivem no
// Histórico, então não reaparecem aqui para evitar cobrança em dobro.
const SELLABLE_ORDERS = INITIAL_ORDERS.filter(
  (o) => !CLOSED_COLUMN_IDS.includes(o.columnId)
)

// Formas de pagamento distintas — crédito e débito são chaves separadas para
// que o passo de pagamento não precise de um sub-seletor de tipo de cartão.
type MethodKey = "dinheiro" | "cartao_credito" | "cartao_debito" | "pix"

const METHOD_LABEL: Record<MethodKey, string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  pix: "Pix",
}

const METHODS: { key: MethodKey; label: string; icon: typeof Banknote }[] = [
  { key: "dinheiro", label: METHOD_LABEL.dinheiro, icon: Banknote },
  { key: "cartao_credito", label: METHOD_LABEL.cartao_credito, icon: CreditCard },
  { key: "cartao_debito", label: METHOD_LABEL.cartao_debito, icon: CreditCard },
  { key: "pix", label: METHOD_LABEL.pix, icon: QrCode },
]

// Modelo de edição na tela (amount como texto). Ao finalizar vira Payment[] — o
// mesmo formato que o Histórico registra.
interface PaymentEntry {
  id: string
  methodKey: MethodKey
  amount: string
  installments?: number
}

// Linha do pedido — unifica produtos do catálogo e ordens de serviço, que têm
// ids independentes (por isso a origem fica explícita em `source`).
interface CartLine {
  id: string
  refId: string
  source: "product" | "order"
  name: string
  qty: number
  lineTotal: number
  type: "produto" | "servico"
}

const INSTALLMENTS = Array.from({ length: 12 }, (_, i) => i + 1)

// Formata um número para o texto que o input de valor espera (ex.: 1234.5 -> "1234,50").
function toAmountString(value: number): string {
  return Math.max(0, value).toFixed(2).replace(".", ",")
}

function ProductCard({
  product,
  qty,
  onAdd,
  onRemove,
}: {
  product: Product
  qty: number
  onAdd: () => void
  onRemove: () => void
}) {
  // Serviço não controla estoque: sempre disponível e sem limite de quantidade.
  const service = isService(product.category)
  const soldOut = !service && product.stock <= 0
  const maxed = !service && qty >= product.stock

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={onAdd}
      className={cn(
        "flex flex-col justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
        soldOut
          ? "cursor-not-allowed border-(--color-border) bg-(--color-surface-raised) opacity-50"
          : qty > 0
            ? "border-(--color-accent) bg-primary/5"
            : "border-(--color-border) bg-(--color-surface-raised) hover:border-primary/50"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium leading-tight text-(--color-text-primary)">
          {product.name}
        </span>
        <span className="text-[11px] text-(--color-text-secondary)">
          {service ? "Sob demanda" : soldOut ? "Esgotado" : `${product.stock} em estoque`}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-[13px] font-semibold text-(--color-text-primary)">
          {formatCurrency(product.price)}
        </span>

        {qty > 0 ? (
          <div
            className="flex items-center gap-1 rounded-lg bg-(--color-surface) p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              role="button"
              tabIndex={0}
              onClick={onRemove}
              className="flex size-6 items-center justify-center rounded-md text-(--color-text-secondary) hover:bg-(--color-surface-raised) hover:text-(--color-text-primary)"
            >
              <Minus size={14} />
            </span>
            <span className="min-w-4 text-center text-[13px] font-semibold text-(--color-text-primary)">
              {qty}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={maxed ? undefined : onAdd}
              className={cn(
                "flex size-6 items-center justify-center rounded-md",
                maxed
                  ? "text-(--color-text-secondary)/40"
                  : "text-(--color-text-secondary) hover:bg-(--color-surface-raised) hover:text-(--color-text-primary)"
              )}
            >
              <Plus size={14} />
            </span>
          </div>
        ) : (
          <span className="flex size-7 items-center justify-center rounded-lg bg-(--color-accent) text-white">
            <Plus size={15} />
          </span>
        )}
      </div>
    </button>
  )
}

// Card de uma ordem de serviço na aba "Ordens". Alterna a seleção — a ordem
// entra no pedido pelo seu valor cadastrado (sempre quantidade 1).
function OrderCard({
  order,
  selected,
  disabled,
  onToggle,
}: {
  order: Order
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex flex-col justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
        selected
          ? "border-(--color-accent) bg-primary/5"
          : disabled
            ? "cursor-not-allowed border-(--color-border) bg-(--color-surface-raised) opacity-50"
            : "border-(--color-border) bg-(--color-surface-raised) hover:border-primary/50"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium leading-tight text-(--color-text-primary)">
          {order.title}
        </span>
        <span className="text-[11px] text-(--color-text-secondary)">{order.client}</span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-[13px] font-semibold text-(--color-text-primary)">
          {formatCurrency(order.value)}
        </span>
        <span className="flex size-7 items-center justify-center rounded-lg bg-(--color-accent) text-white">
          {selected ? <Check size={15} /> : <Plus size={15} />}
        </span>
      </div>
    </button>
  )
}

// Indicador dos 2 passos do pedido. Voltar para "Pedido" é sempre possível;
// avançar para "Pagamento" só quando o pedido está pronto para cobrança.
function OrderStepper({
  step,
  canPay,
  onStep,
}: {
  step: 1 | 2
  canPay: boolean
  onStep: (s: 1 | 2) => void
}) {
  const steps = [
    { n: 1 as const, label: "Pedido" },
    { n: 2 as const, label: "Pagamento" },
  ]
  return (
    <div className="flex shrink-0 items-center gap-2">
      {steps.map((s, i) => {
        const active = step === s.n
        const done = step > s.n
        const clickable = s.n === 1 || canPay
        return (
          <Fragment key={s.n}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStep(s.n)}
              className={cn(
                "flex items-center gap-2 disabled:cursor-not-allowed",
                clickable && "cursor-pointer"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-(--color-accent) text-white"
                    : done
                      ? "bg-primary/20 text-(--color-accent)"
                      : "bg-(--color-surface-raised) text-(--color-text-secondary)"
                )}
              >
                {done ? <Check size={13} /> : s.n}
              </span>
              <span
                className={cn(
                  "text-[13px] font-medium",
                  active || done ? "text-(--color-text-primary)" : "text-(--color-text-secondary)"
                )}
              >
                {s.label}
              </span>
            </button>
            {i === 0 && (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  done ? "bg-(--color-accent)" : "bg-(--color-border)"
                )}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

export default function FrenteDeCaixaPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Record<string, number>>({})
  const [orderCart, setOrderCart] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Todos")

  const [client, setClient] = useState("")
  const [discountMode, setDiscountMode] = useState<"valor" | "percent">("valor")
  const [discountInput, setDiscountInput] = useState("")

  const [step, setStep] = useState<1 | 2>(1)
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  // Próximo número da sequência única de pedidos (o último registrado no
  // Histórico é o Nº149). Com backend, o número virá do servidor.
  const [orderNumber, setOrderNumber] = useState(150)

  const caixaAberto = useCaixaStore((s) => s.sessaoAtual !== null)

  const showingOrders = category === ORDERS_CATEGORY

  const filteredCatalog = CATALOG.filter((p) => {
    if (category !== "Todos" && p.category !== category) return false
    const q = search.trim().toLowerCase()
    if (q && !p.name.toLowerCase().includes(q) && !p.barcode.includes(q)) return false
    return true
  })

  const filteredOrders = SELLABLE_ORDERS.filter((o) => {
    const q = search.trim().toLowerCase()
    if (q && !o.title.toLowerCase().includes(q) && !o.client.toLowerCase().includes(q))
      return false
    return true
  })

  const productLines: CartLine[] = CATALOG.filter((p) => cart[p.id] > 0).map((p) => ({
    id: p.id,
    refId: p.id,
    source: "product",
    name: p.name,
    qty: cart[p.id],
    lineTotal: p.price * cart[p.id],
    type: isService(p.category) ? "servico" : "produto",
  }))

  const orderLines: CartLine[] = SELLABLE_ORDERS.filter((o) =>
    orderCart.includes(o.id)
  ).map((o) => ({
    id: `order-${o.id}`,
    refId: o.id,
    source: "order",
    name: o.title,
    qty: 1,
    lineTotal: o.value,
    type: "servico",
  }))

  const cartLines = [...productLines, ...orderLines]

  // Ordens de um pedido pertencem a um único cliente: a primeira ordem no
  // carrinho trava o cliente e as ordens de outros clientes ficam bloqueadas.
  const orderClientLock =
    SELLABLE_ORDERS.find((o) => orderCart.includes(o.id))?.client ?? null

  const subtotal = cartLines.reduce((sum, i) => sum + i.lineTotal, 0)

  const parsedDiscount = parsePriceInput(discountInput)
  const discountValue =
    discountMode === "percent"
      ? subtotal * (Math.min(100, parsedDiscount) / 100)
      : Math.min(subtotal, parsedDiscount)
  const total = Math.max(0, subtotal - discountValue)

  // Cada entrada carrega seu próprio valor; o pagamento fecha quando a soma das
  // formas bate com o total.
  const effectiveAmount = (entry: PaymentEntry) => parsePriceInput(entry.amount)
  const paidTotal = payments.reduce((s, e) => s + effectiveAmount(e), 0)
  const remaining = total - paidTotal
  const fullyCovered = payments.length > 0 && Math.abs(remaining) < 0.005
  const canPay = caixaAberto && cartLines.length > 0
  const activeEntry = payments.find((e) => e.id === activeEntryId) ?? null

  // Volta ao passo do pedido, descartando o pagamento em andamento.
  function backToOrder() {
    setPayments([])
    setActiveEntryId(null)
    setStep(1)
  }

  // Editar o pedido invalida o pagamento montado: o catálogo continua visível
  // no passo 2, então qualquer alteração no carrinho retorna ao passo 1 para
  // impedir que uma venda seja finalizada com total desatualizado.
  function editingCart() {
    if (step === 2) backToOrder()
  }

  function addOne(id: string) {
    const product = CATALOG.find((p) => p.id === id)
    if (!product) return
    editingCart()
    setCart((prev) => {
      const current = prev[id] ?? 0
      if (!isService(product.category) && current >= product.stock) return prev
      return { ...prev, [id]: current + 1 }
    })
  }

  function removeOne(id: string) {
    editingCart()
    setCart((prev) => {
      const current = prev[id] ?? 0
      if (current <= 1) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: current - 1 }
    })
  }

  function toggleOrder(id: string) {
    const order = SELLABLE_ORDERS.find((o) => o.id === id)
    if (!order) return
    const adding = !orderCart.includes(id)
    // Trava de cliente: não adiciona ordem de cliente diferente do já travado.
    if (adding && orderClientLock && order.client !== orderClientLock) return
    editingCart()
    setOrderCart((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    )
    // A ordem já vem com cliente associado: ao adicioná-la, preenche o cliente
    // do pedido se ainda não houver um (não sobrescreve escolha manual).
    if (adding && !client) setClient(order.client)
  }

  function removeLine(line: CartLine) {
    editingCart()
    if (line.source === "order") {
      setOrderCart((prev) => prev.filter((id) => id !== line.refId))
      return
    }
    setCart((prev) => {
      const next = { ...prev }
      delete next[line.refId]
      return next
    })
  }

  // Seleciona uma forma de pagamento. Se ela ainda não tem entrada, cria uma
  // (com o restante a alocar, ou o total se for a primeira) e foca nela; se já
  // existe, só devolve o foco do input único para ela.
  function selectMethod(key: MethodKey) {
    setPayments((prev) => {
      const existing = prev.find((e) => e.methodKey === key)
      if (existing) {
        setActiveEntryId(existing.id)
        return prev
      }
      const paidSoFar = prev.reduce((s, e) => s + parsePriceInput(e.amount), 0)
      const amount = prev.length === 0 ? total : total - paidSoFar
      const id = `${key}-${prev.length}`
      const entry: PaymentEntry = {
        id,
        methodKey: key,
        amount: toAmountString(amount),
        ...(key === "cartao_credito" ? { installments: 1 } : {}),
      }
      setActiveEntryId(id)
      return [...prev, entry]
    })
  }

  function removeEntry(id: string) {
    setPayments((prev) => {
      const next = prev.filter((e) => e.id !== id)
      setActiveEntryId((current) => (current === id ? (next[0]?.id ?? null) : current))
      return next
    })
  }

  function updateEntry(id: string, patch: Partial<PaymentEntry>) {
    setPayments((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function clearOrder() {
    setCart({})
    setOrderCart([])
    setPayments([])
    setActiveEntryId(null)
    setDiscountInput("")
    setClient("")
    setStep(1)
  }

  function handleDiscountInput(value: string) {
    const clean = value.replace(/[^\d.,]/g, "")
    setDiscountInput(clean)
    // O desconto vive no passo 2 e altera o total: zera a seleção de pagamento
    // para o usuário realocar sobre o novo total (nada fica pré-selecionado).
    if (step === 2) {
      setPayments([])
      setActiveEntryId(null)
    }
  }

  function handleDiscountMode(mode: "valor" | "percent") {
    setDiscountMode(mode)
    if (step === 2) {
      setPayments([])
      setActiveEntryId(null)
    }
  }

  function goToPayment() {
    if (!caixaAberto) {
      toast.error("Abra o caixa antes de finalizar uma venda.")
      return
    }
    if (cartLines.length === 0) return
    // Nenhuma forma de pagamento vem pré-selecionada: o usuário escolhe.
    setStep(2)
  }

  function handleCheckout() {
    if (!caixaAberto || cartLines.length === 0 || !fullyCovered) return
    // Detalhamento final do pagamento — este é o Payment[] que fica registrado no Histórico.
    const resolved: Payment[] = payments.map((e): Payment => {
      if (e.methodKey === "cartao_credito") {
        return {
          kind: "cartao",
          amount: effectiveAmount(e),
          cardType: "credito",
          installments: e.installments ?? 1,
        }
      }
      if (e.methodKey === "cartao_debito") {
        return { kind: "cartao", amount: effectiveAmount(e), cardType: "debito" }
      }
      return { kind: e.methodKey, amount: effectiveAmount(e) }
    })
    // Corpo completo da venda (cliente, itens com tipo, desconto e pagamentos) —
    // é o que futuramente será enviado ao backend (POST /vendas) e vira o
    // registro correspondente no Histórico.
    const sale: SaleInput = {
      orderNumber,
      clientName: client,
      items: cartLines.map((i) => ({
        name: i.name,
        quantity: i.qty,
        total: i.lineTotal,
        type: i.type,
      })),
      discount: discountValue,
      payments: resolved,
    }
    const methodsLabel = sale.payments.map(describePayment).join(" + ")
    toast.success(
      `Pedido Nº${sale.orderNumber} finalizado${sale.clientName ? ` para ${sale.clientName}` : ""} — ${formatCurrency(total)} em ${methodsLabel}.`
    )
    setOrderNumber((n) => n + 1)
    clearOrder()
  }

  return (
    <div className="-mb-6 flex h-[calc(100dvh-var(--header-height)-3.5rem)] flex-col gap-4">
      {!caixaAberto && (
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-(--color-warning)/30 bg-(--color-warning)/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Lock size={16} className="text-(--color-warning)" />
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-(--color-text-primary)">
                Caixa fechado
              </span>
              <span className="text-[12px] text-(--color-text-secondary)">
                Abra o caixa no Dashboard para poder finalizar vendas na Frente de Caixa.
              </span>
            </div>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => router.push("/dashboard")}>
            Ir para o caixa
          </Button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* Catálogo de produtos / ordens */}
        <div className="flex min-h-0 flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
          <div className="flex items-center gap-3">
            {/* Faixa de categorias rolável na horizontal; "Ordens" fica
                destacada (cor de acento + ícone) por não ser categoria de produto. */}
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg bg-(--color-surface-raised) p-1 scrollbar-none">
              {CATEGORIES.map((c) => {
                const isOrders = c === ORDERS_CATEGORY
                const active = category === c
                return (
                  <Fragment key={c}>
                    {isOrders && (
                      <span className="mx-0.5 h-5 w-px shrink-0 bg-(--color-border)" />
                    )}
                    <button
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                        isOrders
                          ? active
                            ? "bg-(--color-accent) text-white shadow-sm"
                            : "text-(--color-accent) hover:bg-primary/10"
                          : active
                            ? "bg-(--color-surface) text-(--color-text-primary) shadow-sm"
                            : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
                      )}
                    >
                      {isOrders && <ClipboardList size={13} />}
                      {c}
                    </button>
                  </Fragment>
                )
              })}
            </div>

            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-secondary)"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  showingOrders
                    ? "Buscar ordem: título ou cliente"
                    : "Buscar produto: código de barras ou nome"
                }
                className="h-9 pl-8"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {showingOrders ? (
              filteredOrders.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {filteredOrders.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      selected={orderCart.includes(o.id)}
                      disabled={orderClientLock !== null && o.client !== orderClientLock}
                      onToggle={() => toggleOrder(o.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                  <ClipboardList size={28} className="text-(--color-text-secondary)/50" />
                  <p className="text-[14px] text-(--color-text-secondary)">
                    Nenhuma ordem em aberto encontrada.
                  </p>
                </div>
              )
            ) : filteredCatalog.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {filteredCatalog.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    qty={cart[p.id] ?? 0}
                    onAdd={() => addOne(p.id)}
                    onRemove={() => removeOne(p.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                <Search size={28} className="text-(--color-text-secondary)/50" />
                <p className="text-[14px] text-(--color-text-secondary)">
                  Nenhum produto encontrado.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pedido em 2 passos: detalhes e pagamento */}
        <aside className="flex min-h-0 flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">
              Pedido Nº{orderNumber}
            </h2>
            <button
              type="button"
              onClick={clearOrder}
              disabled={
                cartLines.length === 0 && payments.length === 0 && !discountInput && !client
              }
              title="Limpar pedido"
              className="rounded-md p-1.5 text-(--color-danger)/70 transition-colors hover:bg-(--color-danger)/10 hover:text-(--color-danger) disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <OrderStepper
            step={step}
            canPay={canPay}
            onStep={(s) => (s === 1 ? backToOrder() : goToPayment())}
          />

          {/* Trilho horizontal dos 2 passos — desliza entre pedido e pagamento. */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <div
              className="flex h-full w-[200%] transition-transform duration-300 ease-out"
              style={{ transform: step === 2 ? "translateX(-50%)" : "translateX(0)" }}
            >
              {/* Passo 1 — Itens, cliente e total */}
              <div className="flex h-full w-1/2 flex-col gap-5 overflow-y-auto pr-2">
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-(--color-text-primary)">
                    Itens do pedido
                  </span>
                  {cartLines.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-(--color-border) px-4 py-4 text-center">
                      <ShoppingCart size={18} className="shrink-0 text-(--color-text-secondary)/50" />
                      <p className="text-[12px] text-(--color-text-secondary)">
                        Adicione produtos ou ordens ao pedido.
                      </p>
                    </div>
                  ) : (
                    <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
                      {cartLines.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-[13px]"
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 font-medium text-(--color-text-secondary)">
                              {item.qty}×
                            </span>
                            <span className="truncate text-(--color-text-primary)">
                              {item.name}
                            </span>
                            {item.source === "order" && (
                              <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase text-(--color-accent)">
                                Ordem
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeLine(item)}
                              className="shrink-0 text-(--color-text-secondary)/60 hover:text-(--color-danger)"
                              title="Remover item"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <span className="shrink-0 text-(--color-text-primary)">
                            {formatCurrency(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cliente e Total ancorados no rodapé */}
                <div className="mt-auto flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-(--color-text-primary)">
                    Cliente
                  </span>
                  <ClientCombobox value={client} onChange={setClient} align="up" />
                </div>

                {/* Total (o detalhamento de desconto fica no passo de pagamento) */}
                <div className="flex items-center justify-between border-t border-(--color-border) pt-3">
                  <span className="text-[15px] font-semibold text-(--color-text-primary)">
                    Total
                  </span>
                  <span className="text-[15px] font-semibold text-(--color-text-primary)">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Passo 2 — Desconto e formas de pagamento */}
              <div className="flex h-full w-1/2 flex-col gap-3 overflow-y-auto pl-2">
                {/* Desconto */}
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-(--color-text-primary)">
                    Desconto
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg bg-(--color-surface-raised) p-0.5">
                      <button
                        type="button"
                        onClick={() => handleDiscountMode("valor")}
                        className={cn(
                          "flex h-7 w-8 items-center justify-center rounded-md text-[13px] font-medium transition-colors",
                          discountMode === "valor"
                            ? "bg-(--color-accent) text-white"
                            : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
                        )}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscountMode("percent")}
                        className={cn(
                          "flex h-7 w-8 items-center justify-center rounded-md text-[13px] font-medium transition-colors",
                          discountMode === "percent"
                            ? "bg-(--color-accent) text-white"
                            : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
                        )}
                      >
                        %
                      </button>
                    </div>
                    <Input
                      inputMode="decimal"
                      value={discountInput}
                      onChange={(e) => handleDiscountInput(e.target.value)}
                      placeholder={discountMode === "percent" ? "p. ex. 10" : "p. ex. 25,00"}
                      className="h-9 flex-1"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 rounded-xl bg-(--color-surface-raised) px-3 py-2.5 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-(--color-text-secondary)">Subtotal</span>
                    <span className="text-(--color-text-primary)">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-(--color-text-secondary)">Desconto</span>
                    <span className={cn(discountValue > 0 && "text-(--color-success)")}>
                      {discountValue > 0 ? `- ${formatCurrency(discountValue)}` : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-(--color-border) pt-1.5">
                    <span className="text-[14px] font-semibold text-(--color-text-primary)">
                      Total
                    </span>
                    <span className="text-[14px] font-semibold text-(--color-text-primary)">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <span className="text-[13px] font-semibold text-(--color-text-primary)">
                  Forma de pagamento
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {METHODS.map(({ key, label, icon: Icon }) => {
                    const entry = payments.find((e) => e.methodKey === key)
                    const isActive = entry?.id === activeEntryId
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectMethod(key)}
                        className={cn(
                          "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-medium transition-colors",
                          isActive
                            ? "border-(--color-accent) bg-primary/10 text-(--color-accent) ring-1 ring-(--color-accent)"
                            : entry
                              ? "border-primary/50 bg-primary/5 text-(--color-accent)"
                              : "border-(--color-border) bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary)"
                        )}
                      >
                        <Icon size={15} />
                        {label}
                      </button>
                    )
                  })}
                </div>

                {activeEntry && (
                  <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-(--color-text-primary)">
                        Valor — {METHOD_LABEL[activeEntry.methodKey]}
                      </span>
                      <div className="relative w-32">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-(--color-text-secondary)">
                          R$
                        </span>
                        <Input
                          inputMode="decimal"
                          value={activeEntry.amount}
                          onChange={(e) =>
                            updateEntry(activeEntry.id, {
                              amount: e.target.value.replace(/[^\d.,]/g, ""),
                            })
                          }
                          placeholder="0,00"
                          className="h-8 pl-7 text-right"
                        />
                      </div>
                    </div>

                    {activeEntry.methodKey === "cartao_credito" && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-(--color-text-secondary)">Parcelas</span>
                        <Select
                          value={String(activeEntry.installments ?? 1)}
                          onValueChange={(v) =>
                            updateEntry(activeEntry.id, { installments: Number(v) })
                          }
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTALLMENTS.map((n) => {
                              const base = effectiveAmount(activeEntry)
                              return (
                                <SelectItem key={n} value={String(n)}>
                                  {n}x{base > 0 ? ` de ${formatCurrency(base / n)}` : ""}
                                  {n === 1 ? " à vista" : " sem juros"}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Chips das formas já adicionadas — só aparece quando há divisão. */}
                {payments.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {payments.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setActiveEntryId(entry.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
                          entry.id === activeEntryId
                            ? "border-(--color-accent) bg-primary/10 text-(--color-accent)"
                            : "border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text-primary)"
                        )}
                      >
                        {METHOD_LABEL[entry.methodKey]} · {formatCurrency(effectiveAmount(entry))}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            removeEntry(entry.id)
                          }}
                          className="text-(--color-text-secondary)/70 hover:text-(--color-danger)"
                        >
                          <X size={11} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {payments.length > 0 && (
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-[12px] font-medium",
                      Math.abs(remaining) < 0.005
                        ? "bg-(--color-success)/10 text-(--color-success)"
                        : "bg-(--color-warning)/10 text-(--color-warning)"
                    )}
                  >
                    {Math.abs(remaining) < 0.005 ? (
                      <>
                        <span className="flex items-center gap-1.5">
                          <Check size={14} />
                          Pagamento completo
                        </span>
                        <span>{formatCurrency(total)}</span>
                      </>
                    ) : remaining > 0 ? (
                      <>
                        <span>Falta alocar</span>
                        <span>{formatCurrency(remaining)}</span>
                      </>
                    ) : (
                      <>
                        <span>Valor excede o total</span>
                        <span>{formatCurrency(Math.abs(remaining))}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rodapé: ação do passo atual */}
          {step === 1 ? (
            <Button
              onClick={goToPayment}
              disabled={!canPay}
              className="h-12 w-full shrink-0 justify-center rounded-2xl bg-(--color-accent) text-[15px] font-semibold text-white"
            >
              {!caixaAberto
                ? "Abra o caixa para vender"
                : cartLines.length === 0
                  ? "Adicione itens ao pedido"
                  : `Ir para pagamento — ${formatCurrency(total)}`}
            </Button>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                onClick={backToOrder}
                className="h-12 shrink-0 justify-center gap-1.5 rounded-2xl px-4"
              >
                <ArrowLeft size={16} />
                Voltar
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={!fullyCovered}
                className="h-12 flex-1 justify-center gap-1.5 rounded-2xl bg-(--color-accent) text-[15px] font-semibold text-white"
              >
                <Wallet size={16} />
                Finalizar — {formatCurrency(total)}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
