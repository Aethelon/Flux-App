import type { Order } from "@/types/order"

type SellableOrder = Pick<Order, "status" | "finalSaleId">

export function isSellableOrder(order: SellableOrder): boolean {
  return order.status === "completed" && order.finalSaleId === null
}
