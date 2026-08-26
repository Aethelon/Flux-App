import assert from "node:assert/strict"
import test from "node:test"
import {
  applyOrderDragOver,
  moveOrderToDropTarget,
  resolveOrderDropColumnId,
} from "../src/lib/order-dnd.ts"
import type { KanbanColumn, Order } from "../src/types/order.ts"

const columns = [
  { id: "todo", label: "A fazer" },
  { id: "doing", label: "Em andamento" },
] as KanbanColumn[]

const orders = [
  { id: "first", columnId: "todo", title: "Primeira" },
  { id: "second", columnId: "doing", title: "Segunda" },
] as Order[]

test("resolves a drop target from either a column or one of its cards", () => {
  assert.equal(resolveOrderDropColumnId(columns, orders, "doing"), "doing")
  assert.equal(resolveOrderDropColumnId(columns, orders, "second"), "doing")
  assert.equal(resolveOrderDropColumnId(columns, orders, "missing"), null)
})

test("moves a card across columns without mutating the current order list", () => {
  const moved = moveOrderToDropTarget(orders, columns, "first", "second")

  assert.notEqual(moved, orders)
  assert.deepEqual(moved.map((order) => [order.id, order.columnId]), [
    ["first", "doing"],
    ["second", "doing"],
  ])
  assert.equal(orders[0].columnId, "todo")
})

test("moves a card to the end when dropping directly on a column", () => {
  const moved = moveOrderToDropTarget(orders, columns, "first", "doing")

  assert.deepEqual(moved.map((order) => [order.id, order.columnId]), [
    ["second", "doing"],
    ["first", "doing"],
  ])
})

test("returns the same list when drag-over does not change the card column", () => {
  assert.equal(moveOrderToDropTarget(orders, columns, "first", "todo"), orders)
})

test("returns the same list for unknown cards and drop targets", () => {
  assert.equal(moveOrderToDropTarget(orders, columns, "missing", "doing"), orders)
  assert.equal(moveOrderToDropTarget(orders, columns, "first", "missing"), orders)
})

test("does not schedule nested updates when drag-over repeats on the current column", () => {
  let currentOrders = orders
  let currentOverColumnId: string | null = "todo"
  let orderUpdates = 0
  let overColumnUpdates = 0

  const dragOver = () => applyOrderDragOver({
    columns,
    orders: currentOrders,
    activeId: "first",
    overId: "second",
    overColumnId: currentOverColumnId,
    setOverColumnId: (columnId) => {
      overColumnUpdates += 1
      currentOverColumnId = columnId
    },
    setOrders: (update) => {
      orderUpdates += 1
      currentOrders = update(currentOrders)
    },
  })

  dragOver()
  dragOver()

  assert.equal(overColumnUpdates, 1)
  assert.equal(orderUpdates, 1)
  assert.equal(currentOrders.find((order) => order.id === "first")?.columnId, "doing")
})

test("ignores drag-over events that cannot move a known card", () => {
  let updates = 0
  const actions = {
    setOverColumnId: () => { updates += 1 },
    setOrders: () => { updates += 1 },
  }

  applyOrderDragOver({
    columns,
    orders,
    activeId: "first",
    overId: "missing",
    overColumnId: "todo",
    ...actions,
  })
  applyOrderDragOver({
    columns,
    orders,
    activeId: "missing",
    overId: "todo",
    overColumnId: "todo",
    ...actions,
  })
  applyOrderDragOver({
    columns,
    orders,
    activeId: "first",
    overId: "todo",
    overColumnId: "doing",
    ...actions,
  })

  assert.equal(updates, 1)
})

test("does not update hover or orders for a sold card", () => {
  let updates = 0

  applyOrderDragOver({
    columns,
    orders: [{ ...orders[0], finalSaleId: "sale-id" }, orders[1]],
    activeId: "first",
    overId: "second",
    overColumnId: "todo",
    setOverColumnId: () => { updates += 1 },
    setOrders: () => { updates += 1 },
  })

  assert.equal(updates, 0)
  assert.equal(
    moveOrderToDropTarget(
      [{ ...orders[0], finalSaleId: "sale-id" }, orders[1]],
      columns,
      "first",
      "second",
    )[0].columnId,
    "todo",
  )
})
