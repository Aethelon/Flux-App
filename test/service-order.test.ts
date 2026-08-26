import assert from "node:assert/strict"
import test from "node:test"
import { isSellableOrder } from "../src/lib/service-order.ts"

test("permite vender uma ordem concluída que ainda não foi vendida", () => {
  assert.equal(isSellableOrder({ status: "completed", finalSaleId: null }), true)
})

test("não permite vender ordens abertas, canceladas ou já vendidas", () => {
  assert.equal(isSellableOrder({ status: "open", finalSaleId: null }), false)
  assert.equal(isSellableOrder({ status: "cancelled", finalSaleId: null }), false)
  assert.equal(isSellableOrder({ status: "completed", finalSaleId: "sale-id" }), false)
})
