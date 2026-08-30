import type { Order } from "@/types/order"

type SellableOrder = Pick<Order, "status" | "readyForSale" | "finalSaleId">

export function isSellableOrder(order: SellableOrder): boolean {
  return order.status === "open" && order.readyForSale && order.finalSaleId === null
}
