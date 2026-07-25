"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Eye, Pencil, Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, Column } from "@/components/shared/DataTable"
import { StatCard } from "@/components/shared/StatCard"
import { FilterDropdown } from "@/components/shared/FilterDropdown"
import { TableSearchInput } from "@/components/shared/TableSearchInput"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { formatCurrency, formatPriceInput, parsePriceInput } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { api, idempotencyHeaders } from "@/lib/api"
import { useCategoriesStore } from "@/store/categoriesStore"
import { useUnitsStore } from "@/store/unitsStore"
import { useProductsStore } from "@/store/productsStore"
import type { Unit, Category } from "@/types/settings"
import type { Product } from "@/types/product"

function StockCell({ product }: { product: Product }) {
  if (product.type === "service") {
    return <span className="text-[14px] text-(--color-text-secondary)">Sob demanda</span>
  }
  const dotClass =
    product.status === "Inativo"
      ? "bg-(--color-text-secondary)"
      : product.status === "Esgotado"
      ? "bg-(--color-danger)"
      : product.status === "Baixo estoque"
        ? "bg-(--color-warning)"
        : "bg-(--color-success)"
  const textClass =
    product.status === "Inativo"
      ? "text-(--color-text-secondary)"
      : product.status === "Esgotado"
      ? "text-(--color-danger)"
      : product.status === "Baixo estoque"
        ? "text-(--color-warning)"
        : "text-(--color-text-primary)"

  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2 rounded-full shrink-0", dotClass)} />
      <span className={cn("text-[14px]", textClass)}>
        {product.status === "Esgotado" ? "Esgotado" : `${product.stock} ${product.unit}`}
      </span>
    </div>
  )
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "Ativo", label: "Ativo" },
  { value: "Baixo estoque", label: "Baixo estoque" },
  { value: "Esgotado", label: "Esgotado" },
  { value: "Inativo", label: "Inativo" },
]

const PER_PAGE = 10

interface ProductForm {
  type: Product["type"]
  name: string
  description: string
  barcode: string
  category: string
  unit: string
  stock: string
  price: string
  cost: string
  minStock: string
  active: boolean
}

const EMPTY_FORM: ProductForm = {
  type: "finished_product",
  name: "",
  description: "",
  barcode: "",
  category: "",
  unit: "",
  stock: "",
  price: "",
  cost: "",
  minStock: "0",
  active: true,
}

function matchesQuantityScale(value: number, scale: number) {
  const factor = 10 ** scale
  return Math.abs((value * factor) - Math.round(value * factor)) < 1e-9
}

export default function InventarioPage() {
  const products = useProductsStore((state) => state.products)
  const loadProducts = useProductsStore((state) => state.loadProducts)

  // Categorias e unidades vêm dos mesmos stores editados em Configurações —
  // cadastrar/renomear lá reflete aqui imediatamente.
  const categories = useCategoriesStore((s) => s.categories)
  const units = useUnitsStore((s) => s.units)
  const loadCategories = useCategoriesStore((s) => s.loadCategories)
  const loadUnits = useUnitsStore((s) => s.loadUnits)

  useEffect(() => {
    void Promise.all([loadCategories(), loadUnits(), loadProducts()])
      .catch(() => toast.error("Não foi possível carregar o inventário."))
  }, [loadCategories, loadProducts, loadUnits])
  const categoryFilters = [
    { value: "todas", label: "Todas" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ]
  // A busca global manda o produto escolhido em `?q=` para a tela abrir filtrada.
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [categoryFilter, setCategoryFilter] = useState("todas")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [page, setPage] = useState(1)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Serviços ficam fora das métricas de estoque (não têm itens armazenados).
  const stockControlled = products.filter((p) => p.type !== "service")
  const totalItems = stockControlled.reduce((sum, p) => sum + p.stock, 0)
  const totalValue = stockControlled.reduce((sum, p) => sum + p.stock * p.price, 0)
  const lowStockCount = products.filter((p) => p.status === "Baixo estoque").length
  const outOfStockCount = products.filter((p) => p.status === "Esgotado").length

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== "todas" && p.category !== categoryFilter) return false
    if (statusFilter !== "todos" && p.status !== statusFilter) return false
    return true
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function openAdd() {
    setForm({
      ...EMPTY_FORM,
      category: categories[0]?.name ?? "",
      unit: units[0]?.abbreviation ?? "",
    })
    setAddOpen(true)
  }

  function openEdit(product: Product) {
    setSelectedProduct(product)
    setForm({
      type: product.type,
      name: product.name,
      description: product.description,
      barcode: product.barcode,
      category: product.category,
      unit: product.unit,
      stock: String(product.stock),
      price: formatPriceInput(product.price),
      cost: product.cost === null ? "" : formatPriceInput(product.cost),
      minStock: String(product.minStock),
      active: product.active,
    })
    setEditOpen(true)
  }

  function openDelete(product: Product) {
    setSelectedProduct(product)
    setDeleteOpen(true)
  }

  function openView(product: Product) {
    setSelectedProduct(product)
    setViewOpen(true)
  }

  async function handleAdd() {
    if (submitting) return
    const service = form.type === "service"
    const stock = service ? 0 : Number(form.stock) || 0
    const minStock = service ? 0 : Number(form.minStock) || 0
    const category = categories.find((item) => item.name === form.category)
    const unit = units.find((item) => item.abbreviation === form.unit)
    if (!category || !unit) {
      toast.error("Selecione uma categoria e uma unidade.")
      return
    }
    if (stock < 0 || minStock < 0) {
      toast.error("Os valores de estoque não podem ser negativos.")
      return
    }
    if (!matchesQuantityScale(stock, unit.quantityScale)
      || !matchesQuantityScale(minStock, unit.quantityScale)) {
      toast.error(`A unidade selecionada aceita até ${unit.quantityScale} casas decimais.`)
      return
    }
    if (!service && stock > 0 && !form.cost) {
      toast.error("Informe o custo unitário para lançar o estoque inicial.")
      return
    }
    setSubmitting(true)
    let productCreated = false
    try {
      const created = await api.post("products", {
        headers: idempotencyHeaders(),
        json: {
          barcode: form.barcode || null,
          type: form.type,
          name: form.name,
          description: form.description,
          active: form.active,
          minimumStock: minStock,
          priceCents: Math.round(parsePriceInput(form.price) * 100),
          costCents: form.cost ? Math.round(parsePriceInput(form.cost) * 100) : null,
          costSource: form.cost ? "manual" : null,
          categoryId: category.id,
          unitId: unit.id,
        },
      }).json<{ id: string }>()
      productCreated = true
      if (stock > 0) {
        await api.post("inventory/movements", {
          headers: idempotencyHeaders(),
          json: {
            productId: created.id,
            type: "positive_adjustment",
            quantity: stock,
            unitCostCents: form.cost
              ? Math.round(parsePriceInput(form.cost) * 100)
              : undefined,
            reason: "Initial inventory balance.",
          },
        })
      }
      await loadProducts()
      setAddOpen(false)
      toast.success("Produto adicionado com sucesso.")
    } catch {
      if (productCreated) {
        await loadProducts().catch(() => undefined)
        setAddOpen(false)
        toast.error(stock > 0
          ? "Produto criado, mas não foi possível lançar o estoque inicial. Ajuste o saldo editando o produto."
          : "Produto criado, mas não foi possível recarregar o inventário.")
      } else {
        toast.error("Não foi possível adicionar o produto.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit() {
    if (!selectedProduct || submitting) return
    const service = selectedProduct.type === "service"
    const stock = service ? 0 : Number(form.stock) || 0
    const minStock = service ? 0 : Number(form.minStock) || 0
    const category = categories.find((item) => item.name === form.category)
    const unit = units.find((item) => item.abbreviation === form.unit)
    if (!category || !unit) {
      toast.error("Selecione uma categoria e uma unidade.")
      return
    }
    if (stock < 0 || minStock < 0) {
      toast.error("Os valores de estoque não podem ser negativos.")
      return
    }
    if (!matchesQuantityScale(stock, unit.quantityScale)
      || !matchesQuantityScale(minStock, unit.quantityScale)) {
      toast.error(`A unidade selecionada aceita até ${unit.quantityScale} casas decimais.`)
      return
    }
    if (!service && stock > selectedProduct.stock && !form.cost) {
      toast.error("Informe o custo unitário para aumentar o saldo de estoque.")
      return
    }
    setSubmitting(true)
    let productUpdated = false
    try {
      await api.patch(`products/${selectedProduct.id}`, {
        headers: idempotencyHeaders(),
        json: {
          version: selectedProduct.version,
          barcode: form.barcode || null,
          name: form.name,
          description: form.description,
          active: form.active,
          minimumStock: minStock,
          priceCents: Math.round(parsePriceInput(form.price) * 100),
          costCents: form.cost ? Math.round(parsePriceInput(form.cost) * 100) : null,
          costSource: form.cost ? "manual" : null,
          categoryId: category.id,
          unitId: unit.id,
          changeReason: "Updated through inventory screen.",
        },
      })
      productUpdated = true
      const difference = stock - selectedProduct.stock
      if (!service && difference !== 0) {
        await api.post("inventory/movements", {
          headers: idempotencyHeaders(),
          json: {
            productId: selectedProduct.id,
            type: difference > 0 ? "positive_adjustment" : "negative_adjustment",
            quantity: Math.abs(difference),
            ...(difference > 0 && form.cost
              ? { unitCostCents: Math.round(parsePriceInput(form.cost) * 100) }
              : {}),
            reason: "Inventory balance corrected through inventory screen.",
          },
        })
      }
      await loadProducts()
      setEditOpen(false)
      toast.success("Produto atualizado.")
    } catch {
      if (productUpdated) {
        await loadProducts().catch(() => undefined)
        setEditOpen(false)
        toast.error(stock !== selectedProduct.stock
          ? "Os dados do produto foram atualizados, mas não foi possível ajustar o saldo de estoque."
          : "Produto atualizado, mas não foi possível recarregar o inventário.")
      } else {
        toast.error("Não foi possível atualizar o produto.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedProduct || submitting) return
    setSubmitting(true)
    try {
      await api.delete(`products/${selectedProduct.id}`, {
        headers: idempotencyHeaders(),
        searchParams: { version: selectedProduct.version },
      })
      await loadProducts()
      setDeleteOpen(false)
      toast.success(`${selectedProduct.name} foi removido.`)
      setSelectedProduct(null)
    } catch {
      toast.error("Não foi possível remover o produto.")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<Product>[] = [
    {
      key: "name",
      label: "Produto",
      render: (row) => (
        <div className={cn("flex flex-col", (row.status === "Esgotado" || row.status === "Inativo") && "opacity-60")}>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.name}</span>
            {!row.active && (
              <span className="inline-flex items-center rounded-md bg-border/40 px-1.5 py-0.5 text-[10px] font-medium uppercase text-(--color-text-secondary)">
                Inativo
              </span>
            )}
          </div>
          <span className="text-[11px] text-(--color-text-secondary)">{row.lastUpdate}</span>
        </div>
      ),
    },
    {
      key: "barcode",
      label: "Código",
      render: (row) => (
        <span className="font-mono text-[13px] text-(--color-text-secondary)">
          {row.barcode || "—"}
        </span>
      ),
    },
    {
      key: "category",
      label: "Categoria",
      render: (row) => (
        <span className="inline-flex items-center rounded-md bg-(--color-info)/10 px-2 py-0.5 text-[10px] font-medium uppercase text-(--color-info)">
          {row.category}
        </span>
      ),
    },
    {
      key: "stock",
      label: "Estoque",
      render: (row) => <StockCell product={row} />,
    },
    {
      key: "price",
      label: "Preço Unit.",
      render: (row) => formatCurrency(row.price),
    },
    {
      key: "actions",
      label: "Ações",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openView(row)}
            className="p-1.5 rounded hover:bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            title="Ver produto"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded hover:bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            title="Editar produto"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => openDelete(row)}
            className="p-1.5 rounded hover:bg-(--color-danger)/10 text-(--color-danger)/60 hover:text-(--color-danger) transition-colors"
            title="Remover produto"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Inventário" subtitle="Gerencie seu estoque de produtos" />

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total de Itens" value={totalItems.toLocaleString("pt-BR")} />
        <StatCard label="Valor em Estoque" value={formatCurrency(totalValue)} />
        <StatCard
          label="Baixo Estoque"
          value={lowStockCount}
          valueClassName="text-(--color-warning)"
        />
        <StatCard
          label="Sem Estoque"
          value={outOfStockCount}
          valueClassName="text-(--color-danger)"
        />
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        keyField="id"
        filters={
          <>
            <TableSearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Buscar por nome..."
            />
            <FilterDropdown
              label="Categoria"
              value={categoryFilter}
              options={categoryFilters}
              onChange={(v) => { setCategoryFilter(v); setPage(1) }}
            />
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={STATUS_FILTERS}
              onChange={(v) => { setStatusFilter(v); setPage(1) }}
            />
          </>
        }
        actions={
          <Button
            size="sm"
            className="gap-2 bg-(--color-accent) text-white"
            onClick={openAdd}
          >
            <Plus size={14} />
            Adicionar Produto
          </Button>
        }
        pagination={{
          page,
          total: filtered.length,
          perPage: PER_PAGE,
          onChange: setPage,
        }}
      />

      {/* Modal: Novo Produto */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <ProductFormFields form={form} onChange={setForm} categories={categories} units={units} />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!form.name || submitting}
              className="bg-(--color-accent) text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Produto */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <ProductFormFields
            form={form}
            onChange={setForm}
            categories={categories}
            units={units}
            typeLocked
          />
          <DialogFooter showCloseButton={false} className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 border-(--color-danger)/40 text-(--color-danger) hover:bg-(--color-danger)/10"
              onClick={() => {
                setEditOpen(false)
                if (selectedProduct) openDelete(selectedProduct)
              }}
            >
              <Trash2 size={14} />
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleEdit}
                disabled={!form.name || submitting}
                className="bg-(--color-accent) text-white"
              >
                Salvar Alterações
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Produto */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="flex flex-col gap-3 py-2 text-[14px]">
              {selectedProduct.description && (
                <p className="text-(--color-text-secondary)">{selectedProduct.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-(--color-text-secondary)">Código de barras</span>
                <span className="font-mono">{selectedProduct.barcode || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-(--color-text-secondary)">Categoria</span>
                <span>{selectedProduct.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-(--color-text-secondary)">Estoque</span>
                <StockCell product={selectedProduct} />
              </div>
              {selectedProduct.type !== "service" && (
                <div className="flex items-center justify-between">
                  <span className="text-(--color-text-secondary)">Estoque mínimo</span>
                  <span>{selectedProduct.minStock} {selectedProduct.unit}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-(--color-text-secondary)">Preço Unit.</span>
                <span>{formatCurrency(selectedProduct.price)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-(--color-text-secondary)">Situação</span>
                <span>{selectedProduct.active ? "Ativo" : "Inativo"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-(--color-text-secondary)">Última atualização</span>
                <span>{selectedProduct.lastUpdate}</span>
              </div>
            </div>
          )}
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Remoção */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)">
              <TriangleAlert size={20} />
            </AlertDialogMedia>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProduct?.name} será arquivado e deixará de aparecer nas operações ativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ProductFormFields({
  form,
  onChange,
  categories,
  units,
  typeLocked = false,
}: {
  form: ProductForm
  onChange: (f: ProductForm) => void
  categories: Category[]
  units: Unit[]
  typeLocked?: boolean
}) {
  const service = form.type === "service"
  const selectedUnit = units.find((unit) => unit.abbreviation === form.unit)
  const quantityStep = selectedUnit?.allowsFractional
    ? 10 ** -selectedUnit.quantityScale
    : 1
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-name">Nome</Label>
        <Input
          id="product-name"
          placeholder="Produto 1"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-description">Descrição</Label>
        <Textarea
          id="product-description"
          placeholder="Descrição detalhada do produto"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-type">Tipo</Label>
        <Select
          value={form.type}
          disabled={typeLocked}
          onValueChange={(value) => onChange({ ...form, type: value as Product["type"] })}
        >
          <SelectTrigger id="product-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="finished_product">Produto acabado</SelectItem>
            <SelectItem value="raw_material">Matéria-prima</SelectItem>
            <SelectItem value="packaging">Embalagem</SelectItem>
            <SelectItem value="service">Serviço</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-barcode">Código de barras (opcional)</Label>
        <Input
          id="product-barcode"
          placeholder="Ex: 7891234567890"
          value={form.barcode}
          onChange={(e) => onChange({ ...form, barcode: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-category">Categoria</Label>
          <Select
            value={form.category}
            onValueChange={(v) => onChange({ ...form, category: v as string })}
          >
            <SelectTrigger id="product-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-unit">Unidade</Label>
          <Select
            value={form.unit}
            onValueChange={(v) => onChange({ ...form, unit: v as string })}
          >
            <SelectTrigger id="product-unit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.abbreviation}>
                  {u.abbreviation} — {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-stock">Estoque atual</Label>
          <Input
            id="product-stock"
            type="number"
            step={quantityStep}
            min={0}
            placeholder={service ? "Sob demanda" : "Ex: 5"}
            value={service ? "" : form.stock}
            disabled={service}
            onChange={(e) => onChange({ ...form, stock: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-price">Preço</Label>
          <Input
            id="product-price"
            inputMode="decimal"
            placeholder="Ex: 1.250,00"
            value={form.price}
            onChange={(e) => onChange({ ...form, price: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-cost">Custo unitário</Label>
        <Input
          id="product-cost"
          inputMode="decimal"
          placeholder="Ex: 750,00"
          value={form.cost}
          onChange={(e) => onChange({ ...form, cost: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-min-stock">Estoque mínimo</Label>
          <Input
            id="product-min-stock"
            type="number"
            step={quantityStep}
            min={0}
            placeholder={service ? "—" : "0"}
            value={service ? "" : form.minStock}
            disabled={service}
            onChange={(e) => onChange({ ...form, minStock: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 pb-2.5 cursor-pointer">
          <Checkbox
            checked={form.active}
            onCheckedChange={(checked) => onChange({ ...form, active: checked })}
          />
          <span className="text-[14px] text-(--color-text-primary) font-(family-name:--font-data)">
            Ativo
          </span>
        </label>
      </div>
    </div>
  )
}
