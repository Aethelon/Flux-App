"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Download, Plus, Eye, Pencil, Trash2, TriangleAlert } from "lucide-react"
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
import { INITIAL_PRODUCTS, isService } from "@/data/products"
import { useCategoriesStore } from "@/store/categoriesStore"
import { useUnitsStore } from "@/store/unitsStore"
import type { Unit, Category } from "@/types/settings"
import type { Product } from "@/types/product"

function getProductStatus(stock: number, minStock: number, category: string): Product["status"] {
  if (isService(category)) return "Ativo" // serviço não controla estoque
  if (stock <= 0) return "Esgotado"
  if (stock <= minStock) return "Baixo estoque"
  return "Ativo"
}

function StockCell({ product }: { product: Product }) {
  if (isService(product.category)) {
    return <span className="text-[14px] text-(--color-text-secondary)">Sob demanda</span>
  }
  const dotClass =
    product.status === "Esgotado"
      ? "bg-(--color-danger)"
      : product.status === "Baixo estoque"
        ? "bg-(--color-warning)"
        : "bg-(--color-success)"
  const textClass =
    product.status === "Esgotado"
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
]

const PER_PAGE = 10

interface ProductForm {
  name: string
  description: string
  barcode: string
  category: string
  unit: string
  stock: string
  price: string
  minStock: string
  active: boolean
}

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  barcode: "",
  category: "",
  unit: "",
  stock: "",
  price: "",
  minStock: "0",
  active: true,
}

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)

  // Categorias e unidades vêm dos mesmos stores editados em Configurações —
  // cadastrar/renomear lá reflete aqui imediatamente.
  const categories = useCategoriesStore((s) => s.categories)
  const units = useUnitsStore((s) => s.units)
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

  // Serviços ficam fora das métricas de estoque (não têm itens armazenados).
  const stockControlled = products.filter((p) => !isService(p.category))
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
      name: product.name,
      description: product.description,
      barcode: product.barcode,
      category: product.category,
      unit: product.unit,
      stock: String(product.stock),
      price: formatPriceInput(product.price),
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

  function handleAdd() {
    const service = isService(form.category)
    const stock = service ? 0 : Number(form.stock) || 0
    const minStock = service ? 0 : Number(form.minStock) || 0
    const newProduct: Product = {
      id: String(Date.now()),
      name: form.name,
      description: form.description,
      barcode: form.barcode,
      category: form.category,
      unit: form.unit,
      price: parsePriceInput(form.price),
      stock,
      minStock,
      active: form.active,
      status: getProductStatus(stock, minStock, form.category),
      lastUpdate: "Última atualização: agora",
    }
    setProducts((prev) => [newProduct, ...prev])
    setAddOpen(false)
    toast.success("Produto adicionado com sucesso.")
  }

  function handleEdit() {
    if (!selectedProduct) return
    const service = isService(form.category)
    const stock = service ? 0 : Number(form.stock) || 0
    const minStock = service ? 0 : Number(form.minStock) || 0
    setProducts((prev) =>
      prev.map((p) =>
        p.id === selectedProduct.id
          ? {
              ...p,
              name: form.name,
              description: form.description,
              barcode: form.barcode,
              category: form.category,
              unit: form.unit,
              price: parsePriceInput(form.price),
              stock,
              minStock,
              active: form.active,
              status: getProductStatus(stock, minStock, form.category),
              lastUpdate: "Última atualização: agora",
            }
          : p
      )
    )
    setEditOpen(false)
    toast.success("Produto atualizado.")
  }

  function handleDelete() {
    if (!selectedProduct) return
    setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id))
    setDeleteOpen(false)
    toast.success(`${selectedProduct.name} foi removido.`)
    setSelectedProduct(null)
  }

  const columns: Column<Product>[] = [
    {
      key: "name",
      label: "Produto",
      render: (row) => (
        <div className={cn("flex flex-col", row.status === "Esgotado" && "opacity-60")}>
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
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-(--color-text-secondary) border-(--color-border)"
            >
              <Download size={14} />
              Exportar
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-(--color-accent) text-white"
              onClick={openAdd}
            >
              <Plus size={14} />
              Adicionar Produto
            </Button>
          </>
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
              disabled={!form.name}
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
          <ProductFormFields form={form} onChange={setForm} categories={categories} units={units} />
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
                disabled={!form.name}
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
              {!isService(selectedProduct.category) && (
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
              {selectedProduct?.name} será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              Remover
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
}: {
  form: ProductForm
  onChange: (f: ProductForm) => void
  categories: Category[]
  units: Unit[]
}) {
  const service = isService(form.category)
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
      <div className="grid grid-cols-2 gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-min-stock">Estoque mínimo</Label>
          <Input
            id="product-min-stock"
            type="number"
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
