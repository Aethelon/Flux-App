import type { KanbanColumn, Order } from "@/types/order"

type OrdersUpdate = (update: (previous: Order[]) => Order[]) => void

interface ApplyOrderDragOverOptions {
  columns: KanbanColumn[]
  orders: Order[]
  activeId: string
  overId: string
  overColumnId: string | null
  setOverColumnId: (columnId: string) => void
  setOrders: OrdersUpdate
}

export function resolveOrderDropColumnId(
  columns: KanbanColumn[],
  orders: Order[],
  overId: string
): string | null {
  if (columns.some((column) => column.id === overId)) return overId
  return orders.find((order) => order.id === overId)?.columnId ?? null
}

export function moveOrderToDropTarget(
  orders: Order[],
  columns: KanbanColumn[],
  activeId: string,
  overId: string
): Order[] {
  const activeIndex = orders.findIndex((order) => order.id === activeId)
  if (activeIndex === -1) return orders
  if (orders[activeIndex].finalSaleId) return orders

  const targetColumnId = resolveOrderDropColumnId(columns, orders, overId)
  if (!targetColumnId || orders[activeIndex].columnId === targetColumnId) return orders

  const next = [...orders]
  const [moved] = next.splice(activeIndex, 1)
  const updatedMoved = { ...moved, columnId: targetColumnId }

  if (columns.some((column) => column.id === overId)) {
    next.push(updatedMoved)
  } else {
    const overIndex = next.findIndex((order) => order.id === overId)
    next.splice(overIndex, 0, updatedMoved)
  }

  return next
}

export function applyOrderDragOver({
  columns,
  orders,
  activeId,
  overId,
  overColumnId,
  setOverColumnId,
  setOrders,
}: ApplyOrderDragOverOptions): void {
  const activeOrder = orders.find((order) => order.id === activeId)
  if (!activeOrder || activeOrder.finalSaleId) return

  const targetColumnId = resolveOrderDropColumnId(columns, orders, overId)
  if (!targetColumnId) return

  if (targetColumnId !== overColumnId) setOverColumnId(targetColumnId)

  if (activeOrder.columnId === targetColumnId) return

  setOrders((previous) => moveOrderToDropTarget(previous, columns, activeId, overId))
}
