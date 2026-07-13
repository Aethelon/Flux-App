"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Plus,
  GripVertical,
  Eye,
  Trash2,
  TriangleAlert,
  ChartNoAxesColumnIncreasing,
  LayoutGrid,
  List,
} from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, Column } from "@/components/shared/DataTable"
import { FilterDropdown } from "@/components/shared/FilterDropdown"
import { ClientCombobox } from "@/components/shared/ClientCombobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import type { KanbanColumn, Order, OrderPriority } from "@/types/order"

const INITIAL_COLUMNS: KanbanColumn[] = [
  { id: "pendente",  label: "Pendente",      color: "--color-warning" },
  { id: "andamento", label: "Em Andamento",  color: "--color-accent" },
  { id: "concluido", label: "Concluído",     color: "--color-success" },
  { id: "cancelado", label: "Cancelado",     color: "--color-danger" },
]

const INITIAL_ORDERS: Order[] = [
  { id: "1", columnId: "pendente",  title: "Manutenção de Ar Condicionado", description: "Limpeza completa e recarga de gás do split de 12.000 BTUs.",         client: "Ana Silva",       value: 280, priority: "média", dueAt: "2026-07-15" },
  { id: "2", columnId: "pendente",  title: "Instalação Elétrica",           description: "Instalação de 3 tomadas e 1 disjuntor no quadro da cozinha.",         client: "Bruno Mendes",    value: 350, priority: "alta",  dueAt: "2026-07-16" },
  { id: "3", columnId: "pendente",  title: "Revisão Geral",                 description: "Revisão preventiva de rede hidráulica e elétrica do imóvel.",         client: "Camila Rocha",    value: 180, priority: "baixa", dueAt: "2026-07-18" },
  { id: "4", columnId: "andamento", title: "Montagem de Móveis",            description: "Montagem de guarda-roupa de 6 portas e 2 cômodas.",                   client: "Pedro Alves",     value: 220, priority: "média", dueAt: "2026-07-13" },
  { id: "5", columnId: "andamento", title: "Reparo de Notebook",            description: "Troca de tela e limpeza interna com substituição de pasta térmica.",  client: "Julia Santos",    value: 190, priority: "alta",  dueAt: "2026-07-14" },
  { id: "6", columnId: "concluido", title: "Pintura Residencial",           description: "Pintura de 2 quartos e sala com massa corrida e 2 demãos.",           client: "Fernanda Costa",  value: 780, priority: "baixa", dueAt: "2026-07-10" },
  { id: "7", columnId: "concluido", title: "Limpeza Pós-Obra",              description: "Limpeza pesada pós-reforma em apartamento de 80m².",                  client: "Lucas Teixeira",  value: 420, priority: "baixa", dueAt: "2026-07-09" },
  { id: "8", columnId: "cancelado", title: "Instalação de Rede",            description: "Cabeamento de rede e configuração de roteador (cancelado pelo cliente).", client: "Carlos Oliveira", value: 260, priority: "média", dueAt: "2026-07-08" },
]

const COLOR_OPTIONS = [
  { name: "Âmbar",    value: "--color-warning" },
  { name: "Índigo",   value: "--color-accent" },
  { name: "Verde",    value: "--color-success" },
  { name: "Vermelho", value: "--color-danger" },
  { name: "Azul",     value: "--color-info" },
]

const PRIORITY_OPTIONS: { value: OrderPriority; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "média", label: "Média" },
  { value: "alta",  label: "Alta" },
]

const PRIORITY_COLORS: Record<OrderPriority, string> = {
  baixa: "text-(--color-success)",
  média: "text-(--color-warning)",
  alta: "text-(--color-danger)",
}

function formatDueDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(`${iso}T00:00:00`)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

interface OrderForm {
  title: string
  description: string
  client: string
  value: string
  priority: OrderPriority
  columnId: string
  dueAt: string
}

const EMPTY_ORDER_FORM: OrderForm = {
  title: "",
  description: "",
  client: "",
  value: "",
  priority: "média",
  columnId: "",
  dueAt: "",
}

export default function OrdensPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>(INITIAL_COLUMNS)
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS)

  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [listPage, setListPage] = useState(1)

  const [activeCard, setActiveCard] = useState<Order | null>(null)
  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)

  const [columnModalOpen, setColumnModalOpen] = useState(false)
  const [columnModalMode, setColumnModalMode] = useState<"add" | "edit">("add")
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null)
  const [columnName, setColumnName] = useState("")
  const [columnColor, setColumnColor] = useState(COLOR_OPTIONS[0].value)
  const [deleteColumnOpen, setDeleteColumnOpen] = useState(false)
  const [deletingColumn, setDeletingColumn] = useState<KanbanColumn | null>(null)

  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [orderModalMode, setOrderModalMode] = useState<"add" | "edit">("add")
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [form, setForm] = useState<OrderForm>(EMPTY_ORDER_FORM)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  // Resolve the column an "over" target belongs to (target may be a column or a card).
  function resolveColumnId(overId: string, list: Order[]): string | null {
    if (columns.some((c) => c.id === overId)) return overId
    return list.find((o) => o.id === overId)?.columnId ?? null
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    if (active.data.current?.type === "column") {
      setActiveColumn(columns.find((c) => c.id === active.id) ?? null)
    } else {
      const card = orders.find((o) => o.id === active.id) ?? null
      setActiveCard(card)
      setOverColumnId(card?.columnId ?? null)
    }
  }

  // Live cross-column movement: relocate the dragged card as it hovers a new column.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.data.current?.type !== "card") return

    const activeId = String(active.id)
    const overId = String(over.id)

    setOrders((prev) => {
      const activeIndex = prev.findIndex((o) => o.id === activeId)
      if (activeIndex === -1) return prev

      const targetColId = resolveColumnId(overId, prev)
      if (!targetColId) return prev
      setOverColumnId(targetColId)

      // Same column: let onDragEnd handle the final ordering.
      if (prev[activeIndex].columnId === targetColId) return prev

      const next = [...prev]
      const [moved] = next.splice(activeIndex, 1)
      const updatedMoved = { ...moved, columnId: targetColId }

      const overIsColumn = columns.some((c) => c.id === overId)
      if (overIsColumn) {
        next.push(updatedMoved)
      } else {
        const overIndex = next.findIndex((o) => o.id === overId)
        next.splice(overIndex === -1 ? next.length : overIndex, 0, updatedMoved)
      }
      return next
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    setActiveColumn(null)
    setOverColumnId(null)
    if (!over) return

    if (active.data.current?.type === "column") {
      const overColId = resolveColumnId(String(over.id), orders)
      if (!overColId || overColId === active.id) return
      setColumns((prev) => {
        const oldIndex = prev.findIndex((c) => c.id === active.id)
        const newIndex = prev.findIndex((c) => c.id === overColId)
        if (oldIndex === -1 || newIndex === -1) return prev
        return arrayMove(prev, oldIndex, newIndex)
      })
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    // Cross-column moves already happened in onDragOver; here we only reorder within a column.
    setOrders((prev) => {
      const activeIndex = prev.findIndex((o) => o.id === activeId)
      const overIndex = prev.findIndex((o) => o.id === overId)
      if (activeIndex === -1 || overIndex === -1) return prev
      if (prev[activeIndex].columnId !== prev[overIndex].columnId) return prev
      return arrayMove(prev, activeIndex, overIndex)
    })
  }

  function handleDragCancel() {
    setActiveCard(null)
    setActiveColumn(null)
    setOverColumnId(null)
  }

  function openAddColumn() {
    setColumnModalMode("add")
    setEditingColumn(null)
    setColumnName("")
    setColumnColor(COLOR_OPTIONS[0].value)
    setColumnModalOpen(true)
  }

  function openEditColumn(column: KanbanColumn) {
    setColumnModalMode("edit")
    setEditingColumn(column)
    setColumnName(column.label)
    setColumnColor(column.color)
    setColumnModalOpen(true)
  }

  function handleSaveColumn() {
    if (columnModalMode === "add") {
      setColumns((prev) => [
        ...prev,
        { id: String(Date.now()), label: columnName, color: columnColor },
      ])
      setColumnModalOpen(false)
      toast.success("Coluna adicionada com sucesso.")
      return
    }

    if (!editingColumn) return
    setColumns((prev) =>
      prev.map((c) =>
        c.id === editingColumn.id ? { ...c, label: columnName, color: columnColor } : c
      )
    )
    setColumnModalOpen(false)
    toast.success("Coluna atualizada.")
  }

  function handleDeleteColumn() {
    if (!deletingColumn) return
    setOrders((prev) => prev.filter((o) => o.columnId !== deletingColumn.id))
    setColumns((prev) => prev.filter((c) => c.id !== deletingColumn.id))
    setDeleteColumnOpen(false)
    toast.success(`Coluna "${deletingColumn.label}" foi removida.`)
    setDeletingColumn(null)
  }

  function openAddOrder(columnId: string) {
    setSelectedOrder(null)
    setOrderModalMode("add")
    setForm({ ...EMPTY_ORDER_FORM, columnId })
    setOrderModalOpen(true)
  }

  function openOrder(order: Order) {
    setSelectedOrder(order)
    setOrderModalMode("edit")
    setForm({
      title: order.title,
      description: order.description,
      client: order.client,
      value: formatPriceInput(order.value),
      priority: order.priority,
      columnId: order.columnId,
      dueAt: order.dueAt,
    })
    setOrderModalOpen(true)
  }

  function openDeleteOrder(order: Order) {
    setSelectedOrder(order)
    setDeleteOrderOpen(true)
  }

  function handleSaveOrder() {
    if (orderModalMode === "add") {
      const newOrder: Order = {
        id: String(Date.now()),
        columnId: form.columnId || columns[0]?.id || "",
        title: form.title,
        description: form.description,
        client: form.client,
        value: parsePriceInput(form.value),
        priority: form.priority,
        dueAt: form.dueAt,
      }
      setOrders((prev) => [...prev, newOrder])
      setOrderModalOpen(false)
      toast.success("Ordem de serviço adicionada com sucesso.")
      return
    }

    if (!selectedOrder) return
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              title: form.title,
              description: form.description,
              client: form.client,
              value: parsePriceInput(form.value),
              priority: form.priority,
              columnId: form.columnId,
              dueAt: form.dueAt,
            }
          : o
      )
    )
    setOrderModalOpen(false)
    toast.success("Ordem de serviço atualizada.")
  }

  function handleDeleteOrder() {
    if (!selectedOrder) return
    setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id))
    setDeleteOrderOpen(false)
    toast.success(`${selectedOrder.title} foi removida.`)
    setSelectedOrder(null)
  }

  const LIST_PER_PAGE = 10
  const statusFilterOptions = [
    { value: "todos", label: "Todos" },
    ...columns.map((c) => ({ value: c.id, label: c.label })),
  ]
  const listFiltered = orders.filter(
    (o) => statusFilter === "todos" || o.columnId === statusFilter
  )
  const listPaginated = listFiltered.slice(
    (listPage - 1) * LIST_PER_PAGE,
    listPage * LIST_PER_PAGE
  )

  const listColumns: Column<Order>[] = [
    {
      key: "title",
      label: "Título",
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    { key: "client", label: "Cliente" },
    {
      key: "columnId",
      label: "Status",
      render: (row) => {
        const col = columns.find((c) => c.id === row.columnId)
        if (!col) return "—"
        return (
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium text-white"
            style={{ backgroundColor: `var(${col.color})` }}
          >
            {col.label}
          </span>
        )
      },
    },
    { key: "value", label: "Valor", render: (row) => formatCurrency(row.value) },
    {
      key: "priority",
      label: "Prioridade",
      render: (row) => (
        <span className={cn("capitalize", PRIORITY_COLORS[row.priority])}>{row.priority}</span>
      ),
    },
    { key: "dueAt", label: "Data", render: (row) => formatDueDate(row.dueAt) },
    {
      key: "actions",
      label: "Ações",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => openOrder(row)}
            className="p-1.5 rounded hover:bg-(--color-surface-raised) text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
            title="Abrir ordem"
          >
            <Eye size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Ordem de Serviço" subtitle="Board Kanban com mudança rápida de status" />

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="inline-flex rounded-lg border border-(--color-border) bg-(--color-surface) p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              viewMode === "kanban"
                ? "bg-(--color-surface-raised) text-(--color-text-primary)"
                : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
            )}
          >
            <LayoutGrid size={14} />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode("lista")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              viewMode === "lista"
                ? "bg-(--color-surface-raised) text-(--color-text-primary)"
                : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
            )}
          >
            <List size={14} />
            Lista
          </button>
        </div>
        {viewMode === "kanban" ? (
          <Button className="w-40 justify-center gap-2 bg-(--color-accent) text-white" onClick={openAddColumn}>
            <Plus size={16} />
            Nova Coluna
          </Button>
        ) : (
          <Button
            className="w-40 justify-center gap-2 bg-(--color-accent) text-white"
            onClick={() => openAddOrder(columns[0]?.id ?? "")}
            disabled={columns.length === 0}
          >
            <Plus size={16} />
            Nova Ordem
          </Button>
        )}
      </div>

      {viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex items-start gap-4 overflow-x-auto pb-4">
              {columns.map((column) => (
                <KanbanColumnView
                  key={column.id}
                  column={column}
                  orders={orders.filter((o) => o.columnId === column.id)}
                  isDropTarget={activeCard !== null && overColumnId === column.id}
                  onAddTask={() => openAddOrder(column.id)}
                  onEditColumn={() => openEditColumn(column)}
                  onOpenOrder={openOrder}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeCard && <OrderCardOverlay order={activeCard} />}
            {activeColumn && (
              <div className="w-72 shrink-0 rounded-xl border border-(--color-border) bg-(--color-surface) p-3 shadow-xl">
                <span
                  className="inline-flex items-center rounded px-2 py-1 text-[13px] font-medium text-white"
                  style={{ backgroundColor: `var(${activeColumn.color})` }}
                >
                  {activeColumn.label}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <DataTable
          columns={listColumns}
          data={listPaginated}
          keyField="id"
          filters={
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={statusFilterOptions}
              onChange={(v) => { setStatusFilter(v); setListPage(1) }}
            />
          }
          pagination={{
            page: listPage,
            total: listFiltered.length,
            perPage: LIST_PER_PAGE,
            onChange: setListPage,
          }}
        />
      )}

      {/* Modal: Nova / Editar Coluna */}
      <Dialog open={columnModalOpen} onOpenChange={setColumnModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{columnModalMode === "edit" ? "Editar Coluna" : "Nova Coluna"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="column-name">Nome</Label>
              <Input
                id="column-name"
                placeholder="Ex: Aguardando Peças"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => setColumnColor(c.value)}
                    className={cn(
                      "size-8 rounded-full ring-2 ring-offset-2 ring-offset-(--color-surface) transition-all",
                      columnColor === c.value ? "ring-(--color-text-primary)" : "ring-transparent"
                    )}
                    style={{ backgroundColor: `var(${c.value})` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="sm:justify-between">
            {columnModalMode === "edit" ? (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 border-(--color-danger)/40 text-(--color-danger) hover:bg-(--color-danger)/10"
                onClick={() => {
                  setColumnModalOpen(false)
                  if (editingColumn) {
                    setDeletingColumn(editingColumn)
                    setDeleteColumnOpen(true)
                  }
                }}
              >
                <Trash2 size={14} />
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setColumnModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveColumn}
                disabled={!columnName}
                className="bg-(--color-accent) text-white"
              >
                {columnModalMode === "edit" ? "Salvar Alterações" : "Criar Coluna"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Remoção de Coluna */}
      <AlertDialog open={deleteColumnOpen} onOpenChange={setDeleteColumnOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)">
              <TriangleAlert size={20} />
            </AlertDialogMedia>
            <AlertDialogTitle>Remover coluna?</AlertDialogTitle>
            <AlertDialogDescription>
              A coluna &quot;{deletingColumn?.label}&quot; e todas as suas ordens de serviço serão
              removidas permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteColumnOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteColumn}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Nova / Editar Ordem */}
      <OrderDialog
        open={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        mode={orderModalMode}
        form={form}
        onChange={setForm}
        columns={columns}
        onSave={handleSaveOrder}
        onDelete={() => {
          setOrderModalOpen(false)
          if (selectedOrder) openDeleteOrder(selectedOrder)
        }}
      />

      {/* Dialog: Confirmar Remoção */}
      <AlertDialog open={deleteOrderOpen} onOpenChange={setDeleteOrderOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-(--color-danger)/10 text-(--color-danger)">
              <TriangleAlert size={20} />
            </AlertDialogMedia>
            <AlertDialogTitle>Remover ordem de serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedOrder?.title} será removida permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOrderOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
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

function KanbanColumnView({
  column,
  orders,
  isDropTarget,
  onAddTask,
  onEditColumn,
  onOpenOrder,
}: {
  column: KanbanColumn
  orders: Order[]
  isDropTarget: boolean
  onAddTask: () => void
  onEditColumn: () => void
  onOpenOrder: (order: Order) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column" },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex min-w-72 flex-1 flex-col gap-4 rounded-xl border p-3 transition-colors",
        isDragging ? "opacity-40" : "opacity-100",
        isDropTarget
          ? "border-primary/60 bg-(--color-surface-raised)"
          : "border-transparent bg-(--color-surface)"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none p-0.5 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors active:cursor-grabbing"
            title="Arrastar coluna"
          >
            <GripVertical size={16} />
          </button>
          <button
            type="button"
            onClick={onEditColumn}
            title="Editar coluna"
            className="inline-flex items-center rounded px-2 py-1 text-[13px] font-medium text-white transition-opacity hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: `var(${column.color})` }}
          >
            {column.label}
          </button>
          <span className="inline-flex items-center justify-center rounded bg-(--color-surface-raised) px-2 py-1 text-[13px] font-medium text-(--color-text-primary)">
            {orders.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="flex items-center justify-center rounded bg-(--color-surface-raised) p-1.5 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <SortableContext items={orders.map((o) => o.id)} strategy={verticalListSortingStrategy}>
        <div className="flex max-h-[calc(100vh-320px)] min-h-24 flex-col gap-3 overflow-y-auto">
          {orders.length === 0 ? (
            <div
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg border border-dashed text-[12px] transition-colors",
                isDropTarget
                  ? "border-primary/60 text-(--color-text-primary)"
                  : "border-(--color-border) text-(--color-text-secondary)"
              )}
            >
              Solte aqui
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onOpen={() => onOpenOrder(order)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function CardBody({
  order,
  onOpen,
}: {
  order: Order
  onOpen?: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
          {order.title}
        </span>
        <span className="shrink-0 text-[11px] text-(--color-text-secondary) font-(family-name:--font-data)">
          {formatDueDate(order.dueAt)}
        </span>
      </div>
      <div className="flex flex-col text-[12px] text-(--color-text-primary) font-(family-name:--font-data)">
        <span>{order.client}</span>
        <span>{formatCurrency(order.value)}</span>
      </div>
      <div className="flex items-center justify-between">
        <ChartNoAxesColumnIncreasing size={16} className={PRIORITY_COLORS[order.priority]} />
        <button
          onClick={(e) => { e.stopPropagation(); onOpen?.() }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center justify-center rounded bg-(--color-surface) p-1 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          title="Abrir ordem"
        >
          <Eye size={14} />
        </button>
      </div>
    </>
  )
}

function OrderCard({
  order,
  onOpen,
}: {
  order: Order
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: order.id,
    data: { type: "card", columnId: order.columnId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // While dragging, the in-place element becomes an empty slot; the DragOverlay renders the card.
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-26 rounded-xl border border-dashed border-primary/50 bg-primary/5"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab touch-none flex-col gap-2 rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-3 transition-shadow hover:border-(--color-text-secondary)/30 active:cursor-grabbing"
    >
      <CardBody order={order} onOpen={onOpen} />
    </div>
  )
}

function OrderCardOverlay({ order }: { order: Order }) {
  return (
    <div className="flex rotate-2 cursor-grabbing flex-col gap-2 rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-3 shadow-2xl ring-1 ring-primary/30">
      <CardBody order={order} />
    </div>
  )
}

function OrderDialog({
  open,
  onOpenChange,
  mode,
  form,
  onChange,
  columns,
  onSave,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  form: OrderForm
  onChange: (f: OrderForm) => void
  columns: KanbanColumn[]
  onSave: () => void
  onDelete: () => void
}) {
  const isEdit = mode === "edit"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle className="sr-only">
          {isEdit ? "Editar ordem de serviço" : "Nova ordem de serviço"}
        </DialogTitle>

        <input
          aria-label="Título"
          placeholder="Título da ordem de serviço"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          className="w-full border-0 bg-transparent pr-10 text-[22px] font-semibold text-(--color-text-primary) outline-none placeholder:text-(--color-text-secondary) font-(family-name:--font-ui)"
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="order-description">Descrição</Label>
            <Textarea
              id="order-description"
              placeholder="Descrição detalhada do serviço"
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              className="min-h-40"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="order-status">Status</Label>
              <Select
                value={form.columnId}
                onValueChange={(v) => onChange({ ...form, columnId: v as string })}
              >
                <SelectTrigger id="order-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="order-client">Cliente</Label>
              <ClientCombobox
                id="order-client"
                value={form.client}
                onChange={(client) => onChange({ ...form, client })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="order-value">Valor (R$)</Label>
              <Input
                id="order-value"
                inputMode="decimal"
                placeholder="Ex: 250,00"
                value={form.value}
                onChange={(e) =>
                  onChange({ ...form, value: e.target.value.replace(/[^\d.,]/g, "") })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="order-priority">Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => onChange({ ...form, priority: v as OrderPriority })}
              >
                <SelectTrigger id="order-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="order-due">Data</Label>
              <Input
                id="order-due"
                type="date"
                value={form.dueAt}
                onChange={(e) => onChange({ ...form, dueAt: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton={false} className="sm:justify-between">
          {isEdit ? (
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 border-(--color-danger)/40 text-(--color-danger) hover:bg-(--color-danger)/10"
              onClick={onDelete}
            >
              <Trash2 size={14} />
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={onSave}
              disabled={!form.title}
              className="bg-(--color-accent) text-white"
            >
              {isEdit ? "Salvar Alterações" : "Criar Ordem"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
