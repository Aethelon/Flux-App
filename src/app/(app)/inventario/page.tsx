"use client"

import { useState } from "react"
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
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"

// Mantido em sincronia com as categorias cadastradas em Configurações > Categorias.
// Numa integração real, ambas as telas consumiriam a mesma listagem via API.
const CATEGORIES = ["Matéria-Prima", "Produto Acabado", "Embalagem", "Serviços"]

// Mantido em sincronia com as unidades cadastradas em Configurações > Unidades de Medida.
const UNITS = [
  { abbreviation: "un", name: "Unidade" },
  { abbreviation: "kg", name: "Quilograma" },
  { abbreviation: "m", name: "Metro" },
  { abbreviation: "m²", name: "Metro Quadrado" },
  { abbreviation: "l", name: "Litro" },
  { abbreviation: "cx", name: "Caixa" },
]

function getProductStatus(stock: number, minStock: number): Product["status"] {
  if (stock <= 0) return "Esgotado"
  if (stock <= minStock) return "Baixo estoque"
  return "Ativo"
}

function parsePriceInput(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".")
  return Number(normalized) || 0
}

function formatPriceInput(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const INITIAL_PRODUCTS: Product[] = [
  { id: "1",  name: "Câmera de Segurança 1080p",      description: "Câmera de segurança Full HD com visão noturna e detecção de movimento.",      barcode: "7891234560011", category: "Produto Acabado", unit: "un", price: 1250.00, stock: 42,  minStock: 10, active: true,  status: "Ativo",         lastUpdate: "Última atualização: 2h atrás" },
  { id: "2",  name: "Fone de Ouvido Bluetooth",        description: "Fone de ouvido sem fio com cancelamento de ruído e até 20h de bateria.",       barcode: "7891234560028", category: "Produto Acabado", unit: "un", price: 450.00,  stock: 5,   minStock: 10, active: true,  status: "Baixo estoque", lastUpdate: "Última atualização: 5h atrás" },
  { id: "3",  name: "Relógio Inteligente",             description: "Relógio inteligente com monitor cardíaco, GPS e notificações.",                barcode: "7891234560035", category: "Produto Acabado", unit: "un", price: 899.00,  stock: 0,   minStock: 10, active: true,  status: "Esgotado",      lastUpdate: "Esgotado há 2 dias" },
  { id: "4",  name: "Luminária de Mesa LED",           description: "Luminária de mesa LED com controle de intensidade e temperatura de cor.",      barcode: "7891234560042", category: "Produto Acabado", unit: "un", price: 79.90,   stock: 120, minStock: 10, active: true,  status: "Ativo",         lastUpdate: "Última atualização: 1d atrás" },
  { id: "5",  name: "Caixa de Som Portátil",           description: "Caixa de som portátil à prova d'água com 12h de autonomia.",                   barcode: "7891234560059", category: "Produto Acabado", unit: "un", price: 320.00,  stock: 18,  minStock: 10, active: true,  status: "Ativo",         lastUpdate: "Última atualização: 3h atrás" },
  { id: "6",  name: "Tecido Impermeável (rolo)",       description: "Rolo de tecido impermeável utilizado na fabricação de bolsas e mochilas.",      barcode: "",              category: "Matéria-Prima",   unit: "m",  price: 24.90,   stock: 85,  minStock: 20, active: true,  status: "Ativo",         lastUpdate: "Última atualização: 6h atrás" },
  { id: "7",  name: "Teclado Mecânico RGB",            description: "Teclado mecânico com iluminação RGB, descontinuado pelo fabricante.",           barcode: "7891234560073", category: "Produto Acabado", unit: "un", price: 399.00,  stock: 0,   minStock: 10, active: false, status: "Esgotado",      lastUpdate: "Esgotado há 5 dias" },
  { id: "8",  name: "Cadeira Ergonômica",              description: "Cadeira ergonômica com apoio lombar ajustável e regulagem de altura.",          barcode: "7891234560080", category: "Produto Acabado", unit: "un", price: 1450.00, stock: 27,  minStock: 10, active: true,  status: "Ativo",         lastUpdate: "Última atualização: 12h atrás" },
  { id: "9",  name: "Caixa de Papelão Personalizada",  description: "Caixa de papelão personalizada para embalagem de produtos acabados.",           barcode: "",              category: "Embalagem",       unit: "un", price: 3.20,    stock: 6,   minStock: 10, active: true,  status: "Baixo estoque", lastUpdate: "Última atualização: 1d atrás" },
  { id: "10", name: "Instalação e Configuração",       description: "Serviço de instalação e configuração de equipamentos no local do cliente.",     barcode: "",              category: "Serviços",        unit: "un", price: 150.00,  stock: 30,  minStock: 5,  active: true,  status: "Ativo",         lastUpdate: "Última atualização: 4h atrás" },
]

function StockCell({ product }: { product: Product }) {
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

const CATEGORY_FILTERS = [
  { value: "todas", label: "Todas" },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
]

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
  category: CATEGORIES[0],
  unit: UNITS[0].abbreviation,
  stock: "",
  price: "",
  minStock: "0",
  active: true,
}

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("todas")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [page, setPage] = useState(1)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)

  const totalItems = products.reduce((sum, p) => sum + p.stock, 0)
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.price, 0)
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
    setForm(EMPTY_FORM)
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
    const stock = Number(form.stock) || 0
    const minStock = Number(form.minStock) || 0
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
      status: getProductStatus(stock, minStock),
      lastUpdate: "Última atualização: agora",
    }
    setProducts((prev) => [newProduct, ...prev])
    setAddOpen(false)
    toast.success("Produto adicionado com sucesso.")
  }

  function handleEdit() {
    if (!selectedProduct) return
    const stock = Number(form.stock) || 0
    const minStock = Number(form.minStock) || 0
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
              status: getProductStatus(stock, minStock),
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
              <span className="inline-flex items-center rounded-md bg-(--color-border)/40 px-1.5 py-0.5 text-[10px] font-medium uppercase text-(--color-text-secondary)">
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
      <PageHeader title="Inventário" subtitle="Gerencie seu estoque de produtos">
        <Button className="gap-2 bg-(--color-accent) text-white" onClick={openAdd}>
          <Plus size={16} />
          Adicionar Produto
        </Button>
      </PageHeader>

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
              options={CATEGORY_FILTERS}
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
            variant="outline"
            size="sm"
            className="gap-2 text-(--color-text-secondary) border-(--color-border)"
          >
            <Download size={14} />
            Exportar
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
          <ProductFormFields form={form} onChange={setForm} />
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
          <ProductFormFields form={form} onChange={setForm} />
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
              <div className="flex items-center justify-between">
                <span className="text-(--color-text-secondary)">Estoque mínimo</span>
                <span>{selectedProduct.minStock} {selectedProduct.unit}</span>
              </div>
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
}: {
  form: ProductForm
  onChange: (f: ProductForm) => void
}) {
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
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
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
              {UNITS.map((u) => (
                <SelectItem key={u.abbreviation} value={u.abbreviation}>
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
            placeholder="Ex: 5"
            value={form.stock}
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
            placeholder="0"
            value={form.minStock}
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
