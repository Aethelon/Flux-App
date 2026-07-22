"use client"

import { Fragment, useEffect, useRef, useState } from "react"
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
import { formatCurrency, parsePriceInput } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { describePayment, type Payment } from "@/types/payment"
import type { SaleInput } from "@/types/history"
import { INITIAL_PRODUCTS, isService } from "@/data/products"
import { INITIAL_ORDERS, CLOSED_COLUMN_IDS } from "@/data/orders"
import type { Product } from "@/types/product"
import type { Order } from "@/types/order"
import { useCaixaStore } from "@/store/caixaStore"
import { useUserStore } from "@/store/userStore"
import {
  AbrirCaixaDialog,
  FecharCaixaDialog,
  ResumoFechamentoDialog,
  type ResumoFechamento,
} from "@/components/caixa/CaixaPanel"

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
  // Forma de pagamento em configuração: nada aqui conta para o total pago até
  // o usuário clicar em "Adicionar" — só então vira uma entrada em `payments`.
  const [pendingMethod, setPendingMethod] = useState<MethodKey | null>(null)
  const [pendingAmount, setPendingAmount] = useState("")
  const [pendingInstallments, setPendingInstallments] = useState(1)
  // Se estiver diferente de null, "Adicionar" edita essa entrada já
  // existente em vez de criar uma nova.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const paymentAmountInputRef = useRef<HTMLInputElement>(null)
  // Controle dos modais de abrir/fechar caixa, acessíveis direto da Frente de Caixa.
  const [abrirCaixaOpen, setAbrirCaixaOpen] = useState(false)
  const [fecharCaixaOpen, setFecharCaixaOpen] = useState(false)
    const [resumoFechamento, setResumoFechamento] = useState<ResumoFechamento | null>(null)
  // Próximo número da sequência única de pedidos. A sequência é persistida
  // no navegador para continuar crescente mesmo após recarregar a tela.
  const [orderNumber, setOrderNumber] = useState(() => {
    if (typeof window === "undefined") return 1
    const saved = window.localStorage.getItem("flux-order-number")
    const parsed = Number(saved)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  })

  const caixaAberto = useCaixaStore((s) => s.sessaoAtual !== null)
  const registrarVenda = useCaixaStore((s) => s.registrarVenda)
  const operador = useUserStore((s) => s.user?.name ?? "Operador")

  useEffect(() => {
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("flux-order-number", String(orderNumber))
    }
  }, [orderNumber])

  useEffect(() => {
    if (step === 2 && pendingMethod) {
      const timer = window.setTimeout(() => paymentAmountInputRef.current?.focus(), 50)
      return () => window.clearTimeout(timer)
    }
  }, [step, pendingMethod])

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
  const change = Math.max(0, paidTotal - total)
  const fullyCovered = payments.length > 0 && paidTotal >= total - 0.005

  const canPay = caixaAberto && cartLines.length > 0

  // Descarta a forma de pagamento em configuração sem adicioná-la/salvá-la.
  // Sem useCallback: o React Compiler memoiza automaticamente em tempo de
  // build — envolver manualmente aqui só conflita com a análise dele.
  function cancelPending() {
    setPendingMethod(null)
    setPendingAmount("")
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
      if (!isService(product.category) && current >= product.stock) return prev
      return { ...prev, [id]: current + 1 }
    })
    setSearch("")
    window.setTimeout(() => searchInputRef.current?.focus(), 0)
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
    setDiscountInput("")
    setClient("")
    setStep(1)
  }

  function handleDiscountInput(value: string) {
    const clean = value.replace(/[^\d.,]/g, "")
    setDiscountInput(clean)
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
    if (step === 2) {
      setPayments([])
      cancelPending()
    }
  }

  function goToPayment() {
    if (!caixaAberto) {
      toast.error("Abra o caixa antes de finalizar uma venda.")
      return
    }
    if (cartLines.length === 0) return

    // Nenhuma forma de pagamento é pré-selecionada: o usuário escolhe e
    // clica em "Adicionar" para cada uma.
    setPayments([])
    cancelPending()
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
      change: change > 0 ? change : undefined,
    }
    const methodsLabel = sale.payments.map(describePayment).join(" + ")
    const changeText = change > 0 ? ` · Troco ${formatCurrency(change)}` : ""
    toast.success(
      `Pedido Nº${sale.orderNumber} finalizado${sale.clientName ? ` para ${sale.clientName}` : ""} — ${formatCurrency(total)} em ${methodsLabel}${changeText}.`
    )
    // Toda venda finalizada gera uma movimentação no caixa para o turno,
    // independentemente do método de pagamento usado.
    registrarVenda(total, sale.orderNumber, operador, methodsLabel, resolved)
    const nextOrderNumber = orderNumber + 1
    setOrderNumber(nextOrderNumber)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("flux-order-number", String(nextOrderNumber))
    }
    clearOrder()
  }

  // Atalho de teclado F2: avança para pagamento no passo 1, ou finaliza a
  // venda no passo 2 se o pagamento já estiver totalmente coberto.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault()
        if (step === 1) {
          goToPayment()
        } else if (fullyCovered) {
          handleCheckout()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

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
                Abra o caixa para poder finalizar vendas na Frente de Caixa.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setAbrirCaixaOpen(true)}
          >
            <Unlock size={14} />
            Abrir caixa
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
                ref={searchInputRef}
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
            <div className="flex items-center gap-1">
              {caixaAberto && (
                <button
                  type="button"
                  onClick={() => setFecharCaixaOpen(true)}
                  title="Fechar caixa"
                  className="rounded-md p-1.5 text-(--color-text-secondary) transition-colors hover:bg-(--color-surface-raised) hover:text-(--color-text-primary)"
                >
                  <Lock size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={clearOrder}
                disabled={
                  cartLines.length === 0 &&
                  payments.length === 0 &&
                  !pendingMethod &&
                  !discountInput &&
                  !client
                }
                title="Limpar pedido"
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
          <div className="min-h-0 flex-1 overflow-hidden">
            <div
              className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: step === 2 ? "translateX(-100%)" : "translateX(0%)" }}
            >
              <div className="flex h-full w-full shrink-0 flex-col gap-5 overflow-y-auto pr-2">
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

                <div className="mt-auto flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-(--color-text-primary)">
                    Cliente
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

              <div className="flex h-full w-full shrink-0 flex-col gap-3 overflow-y-auto pl-2">
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
                    const isPending = pendingMethod === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectMethod(key)}
                        className={cn(
                          "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-medium transition-colors",
                          isPending
                            ? "border-(--color-accent) bg-primary/10 text-(--color-accent) ring-1 ring-(--color-accent)"
                            : entry
                              ? "border-primary/50 bg-primary/5 text-(--color-accent)"
                              : "border-(--color-border) bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary)"
                        )}
                      >
                        <Icon size={15} />
                        {label}
                        {entry && !isPending && <Check size={12} className="ml-0.5" />}
                      </button>
                    )
                  })}
                </div>

                {pendingMethod && (
                  <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-(--color-text-primary)">
                        Valor — {METHOD_LABEL[pendingMethod]}
                      </span>
                      <div className="relative w-32">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-(--color-text-secondary)">
                          R$
                        </span>
                        <Input
                          ref={paymentAmountInputRef}
                          inputMode="decimal"
                          value={pendingAmount}
                          onChange={(e) =>
                            setPendingAmount(e.target.value.replace(/[^\d.,]/g, ""))
                          }
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
                        <span className="text-[12px] text-(--color-text-secondary)">Parcelas</span>
                        <Select
                          value={String(pendingInstallments)}
                          onValueChange={(v) => setPendingInstallments(Number(v))}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTALLMENTS.map((n) => {
                              const base = parsePriceInput(pendingAmount)
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

                    <div className="flex items-center gap-2 pt-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelPending}
                        className="h-8 flex-1 rounded-lg text-[12px]"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={addPendingEntry}
                        disabled={parsePriceInput(pendingAmount) <= 0}
                        className="h-8 flex-1 rounded-lg bg-(--color-accent) text-[12px] text-white"
                      >
                        {editingEntryId ? "Salvar" : "Adicionar"}
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
                      change > 0
                        ? "bg-(--color-accent)/10 text-(--color-accent)"
                        : remaining > 0.005
                          ? "bg-(--color-warning)/10 text-(--color-warning)"
                          : "bg-(--color-success)/10 text-(--color-success)"
                    )}
                  >
                    {change > 0 ? (
                      <>
                        <span className="flex items-center gap-1.5">
                          <Check size={14} />
                          Troco
                        </span>
                        <span>{formatCurrency(change)}</span>
                      </>
                    ) : remaining > 0.005 ? (
                      <>
                        <span>Falta alocar</span>
                        <span>{formatCurrency(remaining)}</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1.5">
                          <Check size={14} />
                          Pagamento completo
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
              className="h-12 w-full shrink-0 justify-center rounded-2xl bg-(--color-accent) text-[15px] font-semibold text-white"
              title="Atalho: F2"
            >
              <span className="flex items-center gap-2">
                {!caixaAberto
                  ? "Abra o caixa para vender"
                  : cartLines.length === 0
                    ? "Adicione itens ao pedido"
                    : `Ir para pagamento — ${formatCurrency(total)}`}
                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                  F2
                </span>
              </span>
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
                title="Atalho: F2"
              >
                <Wallet size={16} />
                <span className="flex items-center gap-2">
                  <span>Finalizar — {formatCurrency(total)}</span>
                  <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    F2
                  </span>
                </span>
              </Button>
            </div>
          )}
        </aside>
      </div>

      <AbrirCaixaDialog open={abrirCaixaOpen} onOpenChange={setAbrirCaixaOpen} />
      <FecharCaixaDialog
        open={fecharCaixaOpen}
        onOpenChange={setFecharCaixaOpen}
        onFechamentoConfirmado={setResumoFechamento}
      />
      <ResumoFechamentoDialog
        resumo={resumoFechamento}
        onOpenChange={() => setResumoFechamento(null)}
      />
    </div>
  )
}