"use client"

import { Fragment, useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type UIEvent } from "react"
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
  Unlock,
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
import { formatCurrency, formatMoneyInput, formatPercentInput, formatPriceInput, parsePriceInput } from "@/lib/formatters"
import { isSellableOrder } from "@/lib/service-order"
import { cn } from "@/lib/utils"
import { describePayment, type Payment } from "@/types/payment"
import type { Product } from "@/types/product"
import type { Order } from "@/types/order"
import { useCaixaStore } from "@/store/caixaStore"
import { useProductsStore } from "@/store/productsStore"
import { useOrdersStore } from "@/store/ordersStore"
import { useClientsStore } from "@/store/clientsStore"
import { api, idempotencyHeaders } from "@/lib/api"
import { AbrirCaixaDialog } from "@/components/caixa/CaixaPanel"
import { cashMessages } from "@/components/caixa/messages"
import { useLocale } from "@/components/layout/LocaleProvider"
import { posMessages } from "./messages"

function usePosMessages() {
  const { locale } = useLocale()
  return posMessages[locale]
}

// "Ordens" entra como uma categoria à parte no fim da lista: são ordens de
// serviço concluídas e ainda não vendidas, disponíveis para cobrança no balcão.
const ORDERS_CATEGORY = "Ordens"

// Formas de pagamento distintas — crédito e débito são chaves separadas para
// que o passo de pagamento não precise de um sub-seletor de tipo de cartão.
type MethodKey = "dinheiro" | "cartao_credito" | "cartao_debito" | "pix"

const METHODS: { key: MethodKey; icon: typeof Banknote }[] = [
  { key: "dinheiro", icon: Banknote },
  { key: "cartao_credito", icon: CreditCard },
  { key: "cartao_debito", icon: CreditCard },
  { key: "pix", icon: QrCode },
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
  return formatPriceInput(Math.max(0, value))
}

// Normaliza texto para comparação de busca: remove acentos e caixa. Usado
// tanto no código/nome/código de barras do produto quanto no termo digitado,
// pra "café" bater com "cafe" e vice-versa.
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function ProductCard({
  product,
  qty,
  highlighted,
  onAdd,
  onRemove,
  cardRef,
}: {
  product: Product
  qty: number
  highlighted: boolean
  onAdd: () => void
  onRemove: () => void
  cardRef: (el: HTMLButtonElement | null) => void
}) {
  // Serviço não controla estoque: sempre disponível e sem limite de quantidade.
  const messages = usePosMessages()
  const service = product.type === "service"
  const soldOut = !service && product.stock <= 0
  const maxed = !service && qty >= product.stock

  return (
    <button
      ref={cardRef}
      type="button"
      disabled={soldOut}
      onClick={onAdd}
      className={cn(
        "flex min-w-0 flex-col justify-between gap-3 rounded-xl border p-2.5 text-left transition-colors sm:p-3",
        soldOut
          ? "cursor-not-allowed border-(--color-border) bg-(--color-surface-raised) opacity-50"
          : qty > 0
            ? "border-(--color-accent) bg-primary/5"
            : "border-(--color-border) bg-(--color-surface-raised) hover:border-primary/50",
        highlighted && "ring-2 ring-(--color-accent) ring-offset-2 ring-offset-(--color-surface)"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="wrap-anywhere text-[13px] font-medium leading-tight text-(--color-text-primary)">
          {product.name}
        </span>
        <span className="text-[11px] text-(--color-text-secondary)">
          {service ? messages.onDemand : soldOut ? messages.outOfStock : messages.inStock(product.stock)}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="wrap-anywhere text-[13px] font-semibold text-(--color-text-primary)">
          {formatCurrency(product.price)}
        </span>

        {qty > 0 ? (
          <div
            className="ml-auto flex items-center gap-1 rounded-lg bg-(--color-surface) p-0.5"
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
          <span className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-lg bg-(--color-accent) text-white">
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
  highlighted,
  onToggle,
  cardRef,
}: {
  order: Order
  selected: boolean
  disabled: boolean
  highlighted: boolean
  onToggle: () => void
  cardRef: (el: HTMLButtonElement | null) => void
}) {
  return (
    <button
      ref={cardRef}
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex min-w-0 flex-col justify-between gap-3 rounded-xl border p-2.5 text-left transition-colors sm:p-3",
        selected
          ? "border-(--color-accent) bg-primary/5"
          : disabled
            ? "cursor-not-allowed border-(--color-border) bg-(--color-surface-raised) opacity-50"
            : "border-(--color-border) bg-(--color-surface-raised) hover:border-primary/50",
        highlighted && "ring-2 ring-(--color-accent) ring-offset-2 ring-offset-(--color-surface)"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="wrap-anywhere text-[13px] font-medium leading-tight text-(--color-text-primary)">
          {order.title}
        </span>
        <span className="wrap-anywhere text-[11px] text-(--color-text-secondary)">{order.client}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="wrap-anywhere text-[13px] font-semibold text-(--color-text-primary)">
          {formatCurrency(order.value)}
        </span>
        <span className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-lg bg-(--color-accent) text-white">
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
  const messages = usePosMessages()
  const steps = [
    { n: 1 as const, label: messages.order },
    { n: 2 as const, label: messages.payment },
  ]
  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {steps.map((s, i) => {
        const active = step === s.n
        const done = step > s.n
        const clickable = !active && (s.n === 1 || canPay)
        return (
          <Fragment key={s.n}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStep(s.n)}
              className={cn(
                "flex items-center gap-1.5 disabled:cursor-not-allowed sm:gap-2",
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
  const { locale } = useLocale()
  const messages = posMessages[locale]
  const cashCopy = cashMessages[locale]
  const CATALOG_BATCH_SIZE = 60
  const [cart, setCart] = useState<Record<string, number>>({})
  const [orderCart, setOrderCart] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Todos")
  // Índice do item destacado no grid (navegação por teclado). É clampado na
  // renderização, então não precisa ficar 100% sincronizado a cada mudança
  // de lista — só é reiniciado quando a busca ou a categoria mudam.
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [visibleProductCount, setVisibleProductCount] = useState(CATALOG_BATCH_SIZE)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])

  const [client, setClient] = useState("")
  const [discountMode, setDiscountMode] = useState<"valor" | "percent">("valor")
  const [discountInput, setDiscountInput] = useState("0,00")

  const [step, setStep] = useState<1 | 2>(1)
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  // Forma de pagamento em configuração: nada aqui conta para o total pago até
  // o usuário clicar em "Adicionar" — só então vira uma entrada em `payments`.
  const [pendingMethod, setPendingMethod] = useState<MethodKey | null>(null)
  const [pendingAmount, setPendingAmount] = useState("0,00")
  const [pendingInstallments, setPendingInstallments] = useState(1)
  // Se estiver diferente de null, "Adicionar" edita essa entrada já
  // existente em vez de criar uma nova.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const paymentAmountInputRef = useRef<HTMLInputElement>(null)
  const orderPanelRef = useRef<HTMLElement>(null)
  // A abertura também fica acessível na Frente de Caixa; o fechamento usa o header global.
  const [abrirCaixaOpen, setAbrirCaixaOpen] = useState(false)
  const [checkoutPending, setCheckoutPending] = useState(false)
  const caixaAberto = useCaixaStore((s) => s.sessaoAtual !== null)
  const loadCash = useCaixaStore((s) => s.loadCash)
  const products = useProductsStore((state) => state.products)
  const loadProducts = useProductsStore((state) => state.loadProducts)
  const orders = useOrdersStore((state) => state.orders)
  const loadOrders = useOrdersStore((state) => state.loadOrders)
  const clients = useClientsStore((state) => state.clients)
  const loadClients = useClientsStore((state) => state.loadClients)
  const SELLABLE_ORDERS = orders.filter(isSellableOrder)
  const CATALOG = products.filter((product) =>
    product.active && product.type !== "raw_material"
  )
  const CATEGORIES = [
    "Todos",
    ...Array.from(new Set(CATALOG.map((product) => product.category))),
    ORDERS_CATEGORY,
  ]

  function updateSearch(value: string) {
    setSearch(value)
    setSelectedIndex(0)
    setVisibleProductCount(CATALOG_BATCH_SIZE)
  }

  function selectCategory(value: string) {
    setCategory(value)
    setSelectedIndex(0)
    setVisibleProductCount(CATALOG_BATCH_SIZE)
  }

  const showLoadError = useEffectEvent(() => toast.error(messages.loadError))

  useEffect(() => {
    void Promise.all([loadProducts(), loadOrders(), loadClients(), loadCash()]).catch(() => showLoadError())
  }, [loadCash, loadClients, loadOrders, loadProducts])

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (step === 2 && pendingMethod) {
      const timer = window.setTimeout(() => paymentAmountInputRef.current?.focus(), 50)
      return () => window.clearTimeout(timer)
    }
  }, [step, pendingMethod])

  const showingOrders = category === ORDERS_CATEGORY

  const filteredCatalog = CATALOG.filter((p) => {
    if (category !== "Todos" && p.category !== category) return false
    const q = normalize(search)
    if (!q) return true
    const haystacks = [p.name, p.barcode, p.category]
    return haystacks.some((value) => value && normalize(value).includes(q))
  })

  const filteredOrders = SELLABLE_ORDERS.filter((o) => {
    const q = normalize(search)
    if (!q) return true
    return normalize(o.title).includes(q) || normalize(o.client).includes(q)
  })
  const visibleCatalog = filteredCatalog.slice(0, visibleProductCount)

  const productLines: CartLine[] = CATALOG.filter((p) => cart[p.id] > 0).map((p) => ({
    id: p.id,
    refId: p.id,
    source: "product",
    name: p.name,
    qty: cart[p.id],
    lineTotal: p.price * cart[p.id],
    type: p.type === "service" ? "servico" : "produto",
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

  // Cada entrada carrega seu próprio valor. Valor excedente só é válido quando
  // pode ser devolvido como troco a partir do pagamento em dinheiro.
  const effectiveAmount = (entry: PaymentEntry) => parsePriceInput(entry.amount)
  const paidTotal = payments.reduce((s, e) => s + effectiveAmount(e), 0)
  const cashPaid = payments
    .filter((e) => e.methodKey === "dinheiro")
    .reduce((s, e) => s + effectiveAmount(e), 0)
  const remaining = total - paidTotal
  const change = Math.max(0, paidTotal - total)
  const changeCoveredByCash = change < 0.005 || cashPaid >= change - 0.005
  const fullyCovered =
    pendingMethod === null &&
    payments.length > 0 &&
    paidTotal >= total - 0.005 &&
    changeCoveredByCash

  const canPay = caixaAberto && cartLines.length > 0

  // Descarta a forma de pagamento em configuração sem adicioná-la/salvá-la.
  // Sem useCallback: o React Compiler memoiza automaticamente em tempo de
  // build — envolver manualmente aqui só conflita com a análise dele.
  function cancelPending() {
    setPendingMethod(null)
    setPendingAmount("0,00")
    setPendingInstallments(1)
    setEditingEntryId(null)
  }

  // Volta ao passo do pedido, descartando o pagamento em andamento.
  function backToOrder() {
    setPayments([])
    cancelPending()
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
      if (product.type !== "service" && current >= product.stock) return prev
      return { ...prev, [id]: current + 1 }
    })
    updateSearch("")
    if (window.matchMedia("(pointer: fine)").matches) {
      window.setTimeout(() => searchInputRef.current?.focus(), 0)
    }
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

  // Seleciona uma forma de pagamento para configurar. Isso só prepara os
  // campos (valor sugerido, parcelas) — nada é somado ao pedido até o
  // usuário clicar em "Adicionar". Se a forma já tiver uma entrada
  // adicionada, carrega os valores dela para edição.
  function selectMethod(key: MethodKey) {
    const existing = payments.find((e) => e.methodKey === key)
    if (existing) {
      setEditingEntryId(existing.id)
      setPendingMethod(key)
      setPendingAmount(existing.amount)
      setPendingInstallments(existing.installments ?? 1)
      return
    }

    const paidSoFar = payments.reduce((s, e) => s + parsePriceInput(e.amount), 0)
    const remaining = Math.max(0, total - paidSoFar)
    const amount = payments.length === 0 ? total : remaining

    setEditingEntryId(null)
    setPendingMethod(key)
    setPendingAmount(toAmountString(amount))
    setPendingInstallments(1)
  }

  // Confirma a forma de pagamento em configuração: cria uma nova entrada, ou
  // atualiza a que está sendo editada. É o único ponto onde uma forma de
  // pagamento passa a contar para o total pago.
  function addPendingEntry() {
    if (!pendingMethod) return
    if (parsePriceInput(pendingAmount) <= 0) return

    setPayments((prev) => {
      if (editingEntryId) {
        return prev.map((e) =>
          e.id === editingEntryId
            ? {
                ...e,
                amount: pendingAmount,
                ...(pendingMethod === "cartao_credito"
                  ? { installments: pendingInstallments }
                  : {}),
              }
            : e
        )
      }

      const id = `${pendingMethod}-${prev.length}-${Date.now()}`
      const entry: PaymentEntry = {
        id,
        methodKey: pendingMethod,
        amount: pendingAmount,
        ...(pendingMethod === "cartao_credito"
          ? { installments: pendingInstallments }
          : {}),
      }
      return [...prev, entry]
    })

    cancelPending()
  }

  function removeEntry(id: string) {
    setPayments((prev) => prev.filter((e) => e.id !== id))
    if (editingEntryId === id) cancelPending()
  }

  function clearOrder() {
    setCart({})
    setOrderCart([])
    setPayments([])
    cancelPending()
    setDiscountInput("0,00")
    setClient("")
    setStep(1)
  }

  function handleDiscountInput(value: string) {
    setDiscountInput(
      discountMode === "percent" ? formatPercentInput(value) : formatMoneyInput(value)
    )
    // O desconto vive no passo 2 e altera o total: zera as formas de
    // pagamento adicionadas para o usuário realocar sobre o novo total
    // (nada fica pré-adicionado).
    if (step === 2) {
      setPayments([])
      cancelPending()
    }
  }

  function handleDiscountMode(mode: "valor" | "percent") {
    setDiscountMode(mode)
    setDiscountInput("0,00")
    if (step === 2) {
      setPayments([])
      cancelPending()
    }
  }

  function goToPayment() {
    if (!caixaAberto) {
      toast.error(messages.registerRequired)
      return
    }
    if (cartLines.length === 0) return

    // Nenhuma forma de pagamento é pré-selecionada: o usuário escolhe e
    // clica em "Adicionar" para cada uma.
    setPayments([])
    cancelPending()
    setStep(2)
    if (window.matchMedia("(width < 64rem)").matches) {
      orderPanelRef.current?.scrollIntoView({ block: "start" })
    }
  }

  async function handleCheckout() {
    if (!caixaAberto || cartLines.length === 0 || !fullyCovered || checkoutPending) return
    setCheckoutPending(true)
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
    const customerId = clients.find((customer) => customer.name === client)?.id
    try {
      const sale = await api.post("sales", {
        headers: idempotencyHeaders(),
        json: {
          customerId: customerId ?? null,
          discountAmountCents: Math.round(discountValue * 100),
          changeAmountCents: Math.round(change * 100),
          items: cartLines.map((item) => item.source === "product"
            ? { productId: item.refId, quantity: item.qty }
            : { serviceOrderId: item.refId }),
          payments: payments.map((payment) => ({
            method: payment.methodKey === "dinheiro"
              ? "cash"
              : payment.methodKey === "cartao_credito"
                ? "credit"
                : payment.methodKey === "cartao_debito"
                  ? "debit"
                  : "pix",
            amountCents: Math.round(effectiveAmount(payment) * 100),
            ...(payment.methodKey === "cartao_credito"
              ? { installments: payment.installments ?? 1 }
              : {}),
          })),
        },
      }).json<{ businessNumber: number }>()
      const methodsLabel = (locale === "pt-BR"
        ? resolved.map(describePayment)
        : payments.map(({ methodKey, installments }) => {
          const label = cashCopy[methodKey]
          return methodKey === "cartao_credito"
            ? `${label}${(installments ?? 1) > 1 ? ` · ${installments}x` : messages.upfront}`
            : label
        })
      ).join(" + ")
      toast.success(messages.saleCompleted(
        sale.businessNumber, client, formatCurrency(total), methodsLabel, change > 0 ? formatCurrency(change) : ""
      ))
      await Promise.all([loadProducts(), loadOrders(), loadCash()])
      clearOrder()
    } catch {
      toast.error(messages.checkoutError)
    } finally {
      setCheckoutPending(false)
    }
  }

  // Atalho de teclado F2: avança para pagamento no passo 1, ou finaliza a
  // venda no passo 2 se o pagamento já estiver totalmente coberto.
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault()
        if (step === 1) {
          goToPayment()
        } else if (fullyCovered && !checkoutPending) {
          handleCheckout()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  // Quantas colunas o grid tem no momento — descoberto pela posição real dos
  // cards na tela (offsetTop), então acompanha o breakpoint responsivo
  // automaticamente sem precisar duplicar a lógica do Tailwind aqui.
  function computeColumns(itemCount: number): number {
    const first = cardRefs.current[0]
    if (!first) return 1
    const firstTop = first.offsetTop
    let cols = 0
    for (const el of cardRefs.current.slice(0, itemCount)) {
      if (!el || el.offsetTop !== firstTop) break
      cols++
    }
    return cols || 1
  }

  // Navegação do catálogo/ordens direto pelo campo de busca: setas para
  // mover o destaque, Enter adiciona o item destacado (cobre também o leitor
  // de código de barras, que digita o código + Enter), Esc limpa a busca e
  // Alt+←/→ troca de categoria sem precisar soltar o teclado.
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault()
      const currentIndex = CATEGORIES.indexOf(category)
      const nextIndex = event.key === "ArrowRight"
        ? (currentIndex + 1) % CATEGORIES.length
        : (currentIndex - 1 + CATEGORIES.length) % CATEGORIES.length
      selectCategory(CATEGORIES[nextIndex])
      return
    }

    if (event.key === "Escape") {
      if (search) {
        event.preventDefault()
        updateSearch("")
      }
      return
    }

    const list = showingOrders ? filteredOrders : filteredCatalog
    if (list.length === 0) return

    if (event.key === "Enter") {
      event.preventDefault()
      const index = Math.min(selectedIndex, list.length - 1)
      if (showingOrders) {
        const order = filteredOrders[index]
        if (order && !(orderClientLock && order.client !== orderClientLock)) {
          toggleOrder(order.id)
        }
      } else {
        addOne(filteredCatalog[index].id)
      }
      return
    }

    let next = selectedIndex
    if (event.key === "ArrowRight") next = selectedIndex + 1
    else if (event.key === "ArrowLeft") next = selectedIndex - 1
    else if (event.key === "ArrowDown") next = selectedIndex + computeColumns(list.length)
    else if (event.key === "ArrowUp") next = selectedIndex - computeColumns(list.length)
    else return

    event.preventDefault()
    next = Math.max(0, Math.min(list.length - 1, next))
    if (!showingOrders && next >= visibleProductCount) {
      setVisibleProductCount(Math.min(
        filteredCatalog.length,
        Math.ceil((next + 1) / CATALOG_BATCH_SIZE) * CATALOG_BATCH_SIZE,
      ))
    }
    setSelectedIndex(next)
    window.setTimeout(() => {
      cardRefs.current[next]?.scrollIntoView({ block: "nearest" })
    }, 0)
  }

  const activeList = showingOrders ? filteredOrders : filteredCatalog
  const activeIndex = Math.min(selectedIndex, activeList.length - 1)

  function handleCatalogScroll(event: UIEvent<HTMLDivElement>) {
    if (showingOrders || visibleProductCount >= filteredCatalog.length) return
    const element = event.currentTarget
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    if (distanceToBottom > 240) return
    setVisibleProductCount((current) => Math.min(
      current + CATALOG_BATCH_SIZE,
      filteredCatalog.length,
    ))
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:-mb-6 lg:h-[calc(100dvh-var(--header-height)-3.5rem)]">
      <h1 className="sr-only">{messages.title}</h1>
      {!caixaAberto && (
        <div className="flex shrink-0 flex-col items-start gap-3 rounded-2xl border border-(--color-warning)/30 bg-(--color-warning)/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Lock size={16} className="shrink-0 text-(--color-warning)" />
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-(--color-text-primary)">
                {cashCopy.cashClosed}
              </span>
              <span className="text-[12px] text-(--color-text-secondary)">
                {messages.registerClosedDetails}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setAbrirCaixaOpen(true)}
          >
            <Unlock size={14} />
            {cashCopy.openRegister}
          </Button>
        </div>
      )}

      <div className="grid min-h-0 grid-cols-1 gap-4 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        {/* Catálogo de produtos / ordens */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) p-3 sm:gap-4 sm:p-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
              {/* Faixa de categorias rolável na horizontal; "Ordens" fica
                  destacada (cor de acento + ícone) por não ser categoria de produto. */}
              <div className="flex w-full min-w-0 shrink-0 items-center gap-1 overflow-x-auto rounded-lg bg-(--color-surface-raised) p-1 lg:w-1/2 lg:max-w-[540px] lg:scrollbar-none">
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
                        onClick={() => selectCategory(c)}
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
                        {isOrders ? messages.orders : c === "Todos" ? messages.all : c}
                      </button>
                    </Fragment>
                  )
                })}
              </div>

              <div className="relative min-w-0 flex-1">
                <Search
                  size={15}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-secondary)"
                />
                <Input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => updateSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  aria-label={showingOrders ? messages.searchOrder : messages.searchProduct}
                  placeholder={
                    showingOrders
                      ? messages.orderPlaceholder
                      : messages.productPlaceholder
                  }
                  className="h-9 pl-8"
                />
              </div>
            </div>

            <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-(--color-text-secondary) sm:flex">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-(--color-border) bg-(--color-surface-raised) px-1.5 py-0.5 font-sans">
                  ↑↓←→
                </kbd>
                {messages.navigate}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-(--color-border) bg-(--color-surface-raised) px-1.5 py-0.5 font-sans">
                  Enter
                </kbd>
                {messages.addShortcut}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-(--color-border) bg-(--color-surface-raised) px-1.5 py-0.5 font-sans">
                  Esc
                </kbd>
                {messages.clearSearch}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-(--color-border) bg-(--color-surface-raised) px-1.5 py-0.5 font-sans">
                  Alt+←/→
                </kbd>
                {messages.changeCategory}
              </span>
            </div>
          </div>

          <div
            className="min-h-0 max-h-[min(40dvh,24rem)] flex-1 overflow-y-auto p-1 lg:max-h-none"
            onScroll={handleCatalogScroll}
          >
            {showingOrders ? (
              filteredOrders.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
                  {filteredOrders.map((o, i) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      selected={orderCart.includes(o.id)}
                      disabled={orderClientLock !== null && o.client !== orderClientLock}
                      highlighted={i === activeIndex}
                      onToggle={() => toggleOrder(o.id)}
                      cardRef={(el) => {
                        cardRefs.current[i] = el
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center lg:py-20">
                  <ClipboardList size={28} className="text-(--color-text-secondary)/50" />
                  <p className="text-[14px] text-(--color-text-secondary)">
                    {messages.noCompletedOrders}
                  </p>
                </div>
              )
            ) : filteredCatalog.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
                {visibleCatalog.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    qty={cart[p.id] ?? 0}
                    highlighted={i === activeIndex}
                    onAdd={() => addOne(p.id)}
                    onRemove={() => removeOne(p.id)}
                    cardRef={(el) => {
                      cardRefs.current[i] = el
                    }}
                  />
                ))}
                {visibleCatalog.length < filteredCatalog.length && (
                  <div className="col-span-full py-2 text-center text-[11px] text-(--color-text-secondary)">
                    {messages.showingProducts(visibleCatalog.length, filteredCatalog.length)}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center lg:py-20">
                <Search size={28} className="text-(--color-text-secondary)/50" />
                <p className="text-[14px] text-(--color-text-secondary)">
                  {messages.noProducts}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pedido em 2 passos: detalhes e pagamento */}
        <aside
          ref={orderPanelRef}
          className="flex min-h-0 min-w-0 scroll-mt-4 flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-3 sm:p-5"
        >
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-[18px] font-semibold text-(--color-text-primary)">
              {messages.newOrder}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearOrder}
                disabled={
                  cartLines.length === 0 &&
                  payments.length === 0 &&
                  !pendingMethod &&
                  parsePriceInput(discountInput) <= 0 &&
                  !client
                }
                title={messages.clearOrder}
                className="rounded-md p-1.5 text-(--color-danger)/70 transition-colors hover:bg-(--color-danger)/10 hover:text-(--color-danger) disabled:pointer-events-none disabled:opacity-40"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <OrderStepper
            step={step}
            canPay={canPay}
            onStep={(s) => (s === 1 ? backToOrder() : goToPayment())}
          />

          {/* Conteúdo do passo atual: pedido ou pagamento.
              Cada painel ocupa 100% da largura (w-full shrink-0) e o
              deslizamento usa translateX(-100%); evita cálculo de
              porcentagem de largura (w-1/2 de um container w-[200%]), que
              pode ser mal resolvido pelo navegador quando há elementos de
              largura fixa dentro do painel (ex.: Select de parcelas). */}
          <div className="min-h-0 min-w-0 flex-1 lg:overflow-hidden">
            <div
              className={cn("lg:flex lg:h-full lg:transition-transform lg:duration-300 lg:ease-out", step === 2 && "lg:-translate-x-full")}
            >
              <div
                inert={step !== 1}
                className={cn(
                  "w-full shrink-0 flex-col gap-5 lg:flex lg:h-full lg:overflow-y-auto lg:pr-2",
                  step === 1 ? "flex" : "hidden"
                )}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-(--color-text-primary)">
                    {messages.items}
                  </span>
                  {cartLines.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-(--color-border) px-4 py-4 text-center">
                      <ShoppingCart size={18} className="shrink-0 text-(--color-text-secondary)/50" />
                      <p className="text-[12px] text-(--color-text-secondary)">
                        {messages.addItems}
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
                                {messages.serviceOrder}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeLine(item)}
                              className="shrink-0 text-(--color-text-secondary)/60 hover:text-(--color-danger)"
                              title={messages.removeItem}
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

                <div className="mt-auto flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-(--color-text-primary)">
                    {messages.customer}
                  </span>
                  <ClientCombobox value={client} onChange={setClient} align="up" />
                </div>

                <div className="flex items-center justify-between border-t border-(--color-border) pt-3">
                  <span className="text-[15px] font-semibold text-(--color-text-primary)">
                    Total
                  </span>
                  <span className="text-[15px] font-semibold text-(--color-text-primary)">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div
                inert={step !== 2}
                className={cn(
                  "w-full shrink-0 flex-col gap-3 lg:flex lg:h-full lg:overflow-y-auto lg:pl-2",
                  step === 2 ? "flex" : "hidden"
                )}
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="pos-discount" className="text-[13px] font-semibold text-(--color-text-primary)">
                    {messages.discount}
                  </label>
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
                      id="pos-discount"
                      inputMode="decimal"
                      value={discountInput}
                      onChange={(e) => handleDiscountInput(e.target.value)}
                      placeholder={discountMode === "percent" ? "10,00" : "25,00"}
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
                    <span className="text-(--color-text-secondary)">{messages.discount}</span>
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
                  {messages.paymentMethod}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {METHODS.map(({ key, icon: Icon }) => {
                    const entry = payments.find((e) => e.methodKey === key)
                    const isPending = pendingMethod === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectMethod(key)}
                        className={cn(
                          "flex min-h-10 items-center justify-center gap-1 rounded-xl border px-1 text-[12px] font-medium transition-colors sm:gap-1.5",
                          isPending
                            ? "border-(--color-accent) bg-primary/10 text-(--color-accent) ring-1 ring-(--color-accent)"
                            : entry
                              ? "border-primary/50 bg-primary/5 text-(--color-accent)"
                              : "border-(--color-border) bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary)"
                        )}
                      >
                        <Icon size={15} className="shrink-0" />
                        {cashCopy[key]}
                        {entry && !isPending && <Check size={12} className="ml-0.5" />}
                      </button>
                    )
                  })}
                </div>

                {pendingMethod && (
                  <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="pos-payment-amount" className="text-[12px] font-semibold text-(--color-text-primary)">
                        {messages.amount} — {cashCopy[pendingMethod]}
                      </label>
                      <div className="relative w-28 shrink-0 sm:w-32">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-(--color-text-secondary)">
                          R$
                        </span>
                        <Input
                          id="pos-payment-amount"
                          ref={paymentAmountInputRef}
                          inputMode="decimal"
                          value={pendingAmount}
                          onChange={(e) => setPendingAmount(formatMoneyInput(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addPendingEntry()
                            }
                          }}
                          placeholder="0,00"
                          className="h-8 pl-7 text-right"
                        />
                      </div>
                    </div>

                    {pendingMethod === "cartao_credito" && (
                      <div className="flex items-center justify-between gap-2">
                        <label htmlFor="pos-installments" className="text-[12px] text-(--color-text-secondary)">
                          {messages.installments}
                        </label>
                        <Select
                          value={String(pendingInstallments)}
                          onValueChange={(v) => setPendingInstallments(Number(v))}
                        >
                          <SelectTrigger id="pos-installments" className="h-8 w-32 max-w-full sm:w-40">
                            <SelectValue>{pendingInstallments}x</SelectValue>
                          </SelectTrigger>
                          <SelectContent className="w-56 max-w-[calc(100vw-2rem)]">
                            {INSTALLMENTS.map((n) => {
                              const base = parsePriceInput(pendingAmount)
                              return (
                                <SelectItem key={n} value={String(n)} className="[&>span:first-child]:whitespace-normal">
                                  {n}x{base > 0 ? messages.installmentAmount(formatCurrency(base / n)) : ""}
                                  {n === 1 ? messages.upfront : messages.interestFree}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelPending}
                        className="h-8 flex-1 rounded-lg text-[12px]"
                      >
                        {messages.cancel}
                      </Button>
                      <Button
                        type="button"
                        onClick={addPendingEntry}
                        disabled={parsePriceInput(pendingAmount) <= 0}
                        className="h-8 flex-1 rounded-lg bg-(--color-accent) text-[12px] text-white"
                      >
                        {editingEntryId ? messages.save : messages.add}
                      </Button>
                    </div>
                  </div>
                )}

                {payments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {payments.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => selectMethod(entry.methodKey)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
                          editingEntryId === entry.id
                            ? "border-(--color-accent) bg-primary/10 text-(--color-accent)"
                            : "border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text-primary)"
                        )}
                      >
                        {cashCopy[entry.methodKey]} · {formatCurrency(effectiveAmount(entry))}
                        <span
                          role="button"
                          aria-label={messages.removePayment}
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
                      "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[12px] font-medium",
                      change > 0 && !changeCoveredByCash
                        ? "bg-(--color-warning)/10 text-(--color-warning)"
                        : change > 0
                        ? "bg-(--color-accent)/10 text-(--color-accent)"
                        : remaining > 0.005
                          ? "bg-(--color-warning)/10 text-(--color-warning)"
                          : "bg-(--color-success)/10 text-(--color-success)"
                    )}
                  >
                    {change > 0 && !changeCoveredByCash ? (
                      <>
                        <span>{messages.cashChangeMissing}</span>
                        <span>{formatCurrency(change)}</span>
                      </>
                    ) : change > 0 ? (
                      <>
                        <span className="flex items-center gap-1.5">
                          <Check size={14} />
                          {messages.change}
                        </span>
                        <span>{formatCurrency(change)}</span>
                      </>
                    ) : remaining > 0.005 ? (
                      <>
                        <span>{messages.pendingAmount}</span>
                        <span>{formatCurrency(remaining)}</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1.5">
                          <Check size={14} />
                          {messages.paid}
                        </span>
                        <span>{formatCurrency(total)}</span>
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
              className="h-auto min-h-12 w-full shrink-0 justify-center rounded-2xl bg-(--color-accent) py-2 text-center text-[15px] font-semibold whitespace-normal text-white"
              title={messages.shortcut}
            >
              <span className="flex items-center gap-2">
                {!caixaAberto
                  ? messages.openToSell
                  : cartLines.length === 0
                    ? messages.addBeforePayment
                    : `${messages.goToPayment} — ${formatCurrency(total)}`}
                <span className="hidden items-center rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide lg:inline-flex">
                  F2
                </span>
              </span>
            </Button>
          ) : (
            <div className="flex shrink-0 flex-wrap items-stretch gap-2">
              <Button
                variant="outline"
                onClick={backToOrder}
                className="h-auto min-h-12 shrink-0 justify-center gap-1.5 rounded-2xl px-4"
              >
                <ArrowLeft size={16} />
                {messages.back}
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={!fullyCovered || checkoutPending}
                className="h-auto min-h-12 flex-1 justify-center gap-1.5 rounded-2xl bg-(--color-accent) py-2 text-center text-[15px] font-semibold whitespace-normal text-white"
                title={messages.shortcut}
              >
                <Wallet size={16} />
                <span className="flex items-center gap-2">
                  <span>{checkoutPending ? messages.finalizing : `${messages.finalize} — ${formatCurrency(total)}`}</span>
                  <span className="hidden items-center rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide lg:inline-flex">
                    F2
                  </span>
                </span>
              </Button>
            </div>
          )}
        </aside>
      </div>

      <AbrirCaixaDialog open={abrirCaixaOpen} onOpenChange={setAbrirCaixaOpen} />
    </div>
  )
}
