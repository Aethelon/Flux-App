import assert from "node:assert/strict"
import test from "node:test"
import { isSellableOrder } from "../src/lib/service-order.ts"

test("permite vender uma ordem pronta que ainda não foi vendida", () => {
  assert.equal(isSellableOrder({ status: "open", readyForSale: true, finalSaleId: null }), true)
})

test("não permite vender ordens fora de Pronto, canceladas, entregues ou já vendidas", () => {
  assert.equal(isSellableOrder({ status: "open", readyForSale: false, finalSaleId: null }), false)
  assert.equal(isSellableOrder({ status: "cancelled", readyForSale: false, finalSaleId: null }), false)
  assert.equal(isSellableOrder({ status: "completed", readyForSale: false, finalSaleId: null }), false)
  assert.equal(isSellableOrder({ status: "open", readyForSale: true, finalSaleId: "sale-id" }), false)
})
