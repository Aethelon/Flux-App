import assert from "node:assert/strict"
import test from "node:test"
import { formatMoneyInput, formatPercentInput, formatPhoneInput } from "../src/lib/formatters"

test("formats typed money digits as Brazilian reais", () => {
  assert.equal(formatMoneyInput("5000000"), "50.000,00")
  assert.equal(formatMoneyInput("0,0054455"), "544,55")
  assert.equal(formatMoneyInput(""), "")
})

test("formats typed percentage digits and limits discounts to one hundred percent", () => {
  assert.equal(formatPercentInput("10"), "10")
  assert.equal(formatPercentInput("10,567"), "10,56")
  assert.equal(formatPercentInput("5545466"), "100")
  assert.equal(formatPercentInput(""), "")
})

test("formats a phone number while it is typed", () => {
  assert.equal(formatPhoneInput("34434343434"), "(34) 43434-3434")
  assert.equal(formatPhoneInput("3443434343"), "(34) 4343-4343")
  assert.equal(formatPhoneInput("344343434344"), "(34) 43434-3434")
  assert.equal(formatPhoneInput("+55 (34) 43434-3434"), "(34) 43434-3434")
})
