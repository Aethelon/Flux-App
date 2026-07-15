"use client"

import { useState } from "react"
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
import {
  PAYMENT_KIND_LABEL,
  describePayment,
  type CardType,
  type Payment,
  type PaymentKind,
} from "@/types/payment"
import type { SaleInput } from "@/types/history"
import { INITIAL_PRODUCTS, isService } from "@/data/products"
import type { Product } from "@/types/product"

// Catálogo vem da mesma fonte do Inventário. A frente de caixa vende itens
// acabados e serviços: matéria-prima não vai ao balcão e itens inativos não
// aparecem para venda.
const CATALOG = INITIAL_PRODUCTS.filter((p) => p.active && p.category !== "Matéria-Prima")

const CATEGORIES = ["Todos", ...Array.from(new Set(CATALOG.map((p) => p.category)))]

const METHODS: { kind: PaymentKind; label: string; icon: typeof Banknote }[] = [
  { kind: "dinheiro", label: PAYMENT_KIND_LABEL.dinheiro, icon: Banknote },
  { kind: "cartao", label: PAYMENT_KIND_LABEL.cartao, icon: CreditCard },
  { kind: "pix", label: PAYMENT_KIND_LABEL.pix, icon: QrCode },
]

// Modelo de edição na tela (amount como texto). Ao finalizar vira Payment[] — o
// mesmo formato que o Histórico registra.
interface PaymentEntry {
  id: string
  kind: PaymentKind
  amount: string
  cardType?: CardType
  installments?: number
}

const INSTALLMENTS = Array.from({ length: 12 }, (_, i) => i + 1)

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

export default function FrenteDeCaixaPage() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Todos")

  const [client, setClient] = useState("")
  const [discountMode, setDiscountMode] = useState<"valor" | "percent">("valor")
  const [discountInput, setDiscountInput] = useState("")

  const [payments, setPayments] = useState<PaymentEntry[]>([])
  // Próximo número da sequência única de pedidos (o último registrado no
  // Histórico é o Nº149). Com backend, o número virá do servidor.
  const [orderNumber, setOrderNumber] = useState(150)

  const filteredCatalog = CATALOG.filter((p) => {
    if (category !== "Todos" && p.category !== category) return false
    const q = search.trim().toLowerCase()
    if (q && !p.name.toLowerCase().includes(q) && !p.barcode.includes(q)) return false
    return true
  })

  const cartItems = CATALOG.filter((p) => cart[p.id] > 0).map((p) => ({
    ...p,
    qty: cart[p.id],
    lineTotal: p.price * cart[p.id],
  }))

  const subtotal = cartItems.reduce((sum, i) => sum + i.lineTotal, 0)

  const parsedDiscount = parsePriceInput(discountInput)
  const discountValue =
    discountMode === "percent"
      ? subtotal * (Math.min(100, parsedDiscount) / 100)
      : Math.min(subtotal, parsedDiscount)
  const total = Math.max(0, subtotal - discountValue)

  const single = payments.length === 1
  const effectiveAmount = (entry: PaymentEntry) =>
    single ? total : parsePriceInput(entry.amount)
  const paidTotal = payments.length === 0 ? 0 : payments.reduce((s, e) => s + effectiveAmount(e), 0)
  const remaining = total - paidTotal
  const fullyCovered = payments.length > 0 && (single || Math.abs(remaining) < 0.005)
  const canCheckout = cartItems.length > 0 && fullyCovered

  function addOne(id: string) {
    const product = CATALOG.find((p) => p.id === id)
    if (!product) return
    setCart((prev) => {
      const current = prev[id] ?? 0
      if (!isService(product.category) && current >= product.stock) return prev
      return { ...prev, [id]: current + 1 }
    })
  }

  function removeOne(id: string) {
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

  function removeLine(id: string) {
    setCart((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function toggleMethod(kind: PaymentKind) {
    setPayments((prev) => {
      const exists = prev.find((e) => e.kind === kind)
      if (exists) return prev.filter((e) => e.kind !== kind)
      return [
        ...prev,
        {
          id: `${kind}-${prev.length}`,
          kind,
          amount: "",
          ...(kind === "cartao" ? { cardType: "credito" as const, installments: 1 } : {}),
        },
      ]
    })
  }

  function updateEntry(id: string, patch: Partial<PaymentEntry>) {
    setPayments((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function clearOrder() {
    setCart({})
    setPayments([])
    setDiscountInput("")
    setClient("")
  }

  function handleCheckout() {
    if (!canCheckout) return
    // Detalhamento final do pagamento — este é o Payment[] que fica registrado no Histórico.
    const resolved: Payment[] = payments.map((e) => ({
      kind: e.kind,
      amount: effectiveAmount(e),
      ...(e.kind === "cartao"
        ? {
            cardType: e.cardType,
            installments: e.cardType === "credito" ? e.installments : undefined,
          }
        : {}),
    }))
    // Corpo completo da venda (cliente, itens com tipo, desconto e pagamentos) —
    // é o que futuramente será enviado ao backend (POST /vendas) e vira o
    // registro correspondente no Histórico.
    const sale: SaleInput = {
      orderNumber,
      clientName: client,
      items: cartItems.map((i) => ({
        name: i.name,
        quantity: i.qty,
        total: i.lineTotal,
        type: i.category === "Serviços" ? "servico" : "produto",
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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
      {/* Catálogo de produtos */}
      <div className="flex flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-(--color-surface-raised) p-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                  category === c
                    ? "bg-(--color-surface) text-(--color-text-primary) shadow-sm"
                    : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative min-w-56 flex-1">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-secondary)"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto: código de barras ou nome"
              className="h-9 pl-8"
            />
          </div>
        </div>

        {filteredCatalog.length > 0 ? (
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

      {/* Detalhes do checkout */}
      <aside className="flex flex-col gap-5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5 lg:sticky lg:top-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-(--color-text-primary)">
            Pedido Nº{orderNumber}
          </h2>
          <button
            type="button"
            onClick={clearOrder}
            disabled={
              cartItems.length === 0 && payments.length === 0 && !discountInput && !client
            }
            title="Limpar pedido"
            className="rounded-md p-1.5 text-(--color-danger)/70 transition-colors hover:bg-(--color-danger)/10 hover:text-(--color-danger) disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Itens do pedido */}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-(--color-text-primary)">
            Itens do pedido
          </span>
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-(--color-border) py-8 text-center">
              <ShoppingCart size={22} className="text-(--color-text-secondary)/50" />
              <p className="px-6 text-[12px] text-(--color-text-secondary)">
                Toque nos produtos para adicioná-los ao pedido.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 font-medium text-(--color-text-secondary)">
                      {item.qty}×
                    </span>
                    <span className="truncate text-(--color-text-primary)">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => removeLine(item.id)}
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

        <div className="h-px w-full bg-(--color-border)" />

        {/* Desconto */}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-(--color-text-primary)">Desconto</span>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-(--color-surface-raised) p-0.5">
              <button
                type="button"
                onClick={() => setDiscountMode("valor")}
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
                onClick={() => setDiscountMode("percent")}
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
              onChange={(e) => setDiscountInput(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder={discountMode === "percent" ? "p. ex. 10" : "p. ex. 25,00"}
              className="h-9 flex-1"
            />
          </div>
        </div>

        {/* Cliente */}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-(--color-text-primary)">Cliente</span>
          <ClientCombobox value={client} onChange={setClient} />
        </div>

        {/* Totais */}
        <div className="flex flex-col gap-1.5 text-[13px]">
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
          <div className="mt-1 flex items-center justify-between border-t border-(--color-border) pt-2">
            <span className="text-[15px] font-semibold text-(--color-text-primary)">Total</span>
            <span className="text-[15px] font-semibold text-(--color-text-primary)">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Forma de pagamento */}
        <div className="flex flex-col gap-3">
          <span className="text-[13px] font-semibold text-(--color-text-primary)">
            Forma de pagamento
          </span>

          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ kind, label, icon: Icon }) => {
              const active = payments.some((e) => e.kind === kind)
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => toggleMethod(kind)}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-medium transition-colors",
                    active
                      ? "border-(--color-accent) bg-primary/10 text-(--color-accent)"
                      : "border-(--color-border) bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary)"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </button>
              )
            })}
          </div>

          {/* Detalhamento por forma de pagamento */}
          {payments.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {payments.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-(--color-text-primary)">
                      {PAYMENT_KIND_LABEL[entry.kind]}
                    </span>
                    {!single && (
                      <div className="relative w-32">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-(--color-text-secondary)">
                          R$
                        </span>
                        <Input
                          inputMode="decimal"
                          value={entry.amount}
                          onChange={(e) =>
                            updateEntry(entry.id, {
                              amount: e.target.value.replace(/[^\d.,]/g, ""),
                            })
                          }
                          placeholder="0,00"
                          className="h-8 pl-7 text-right"
                        />
                      </div>
                    )}
                  </div>

                  {/* Opções de cartão: crédito/débito + parcelas */}
                  {entry.kind === "cartao" && (
                    <div className="flex flex-col gap-2">
                      <div className="inline-flex rounded-lg bg-(--color-surface) p-0.5">
                        {(["credito", "debito"] as const).map((ct) => (
                          <button
                            key={ct}
                            type="button"
                            onClick={() =>
                              updateEntry(entry.id, {
                                cardType: ct,
                                installments: ct === "debito" ? 1 : entry.installments ?? 1,
                              })
                            }
                            className={cn(
                              "flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                              entry.cardType === ct
                                ? "bg-(--color-accent) text-white"
                                : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
                            )}
                          >
                            {ct === "credito" ? "Crédito" : "Débito"}
                          </button>
                        ))}
                      </div>

                      {entry.cardType === "credito" && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] text-(--color-text-secondary)">Parcelas</span>
                          <Select
                            value={String(entry.installments ?? 1)}
                            onValueChange={(v) =>
                              updateEntry(entry.id, { installments: Number(v) })
                            }
                          >
                            <SelectTrigger className="h-8 w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INSTALLMENTS.map((n) => {
                                const base = effectiveAmount(entry)
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
                </div>
              ))}

              {/* Status da alocação (somente em pagamento dividido) */}
              {!single && (
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
          )}
        </div>

        <Button
          onClick={handleCheckout}
          disabled={!canCheckout}
          className="h-12 w-full justify-center rounded-2xl bg-(--color-accent) text-[15px] font-semibold text-white"
        >
          {cartItems.length === 0
            ? "Adicione itens ao pedido"
            : payments.length === 0
              ? "Selecione a forma de pagamento"
              : `Finalizar — ${formatCurrency(total)}`}
        </Button>
      </aside>
    </div>
  )
}
