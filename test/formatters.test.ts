import assert from "node:assert/strict"
import test from "node:test"
import { formatMoneyInput, formatPercentInput, formatPhoneInput, phoneDigits } from "../src/lib/formatters.ts"

test("formats typed money digits as Brazilian reais", () => {
  let amount = formatMoneyInput("")
  assert.equal(amount, "0,00")
  for (const digit of "100000") {
    amount = formatMoneyInput(`${amount}${digit}`)
  }
  assert.equal(amount, "1.000,00")
  assert.equal(formatMoneyInput("5000000"), "50.000,00")
  assert.equal(formatMoneyInput("0,0054455"), "544,55")
  assert.equal(formatMoneyInput(""), "0,00")
})

test("formats typed percentage digits from right to left", () => {
  let percentage = formatPercentInput("")
  assert.equal(percentage, "0,00")
  for (const digit of "1000") {
    percentage = formatPercentInput(`${percentage}${digit}`)
  }
  assert.equal(percentage, "10,00")
  assert.equal(formatPercentInput("10000"), "100,00")
  assert.equal(formatPercentInput("100001"), "100,00")
})

test("formats a phone number while it is typed", () => {
  assert.equal(formatPhoneInput("34434343434"), "(34) 43434-3434")
  assert.equal(formatPhoneInput("3443434343"), "(34) 4343-4343")
  assert.equal(formatPhoneInput("344343434344"), "(34) 43434-3434")
  assert.equal(formatPhoneInput("+55 (34) 43434-3434"), "(34) 43434-3434")
})

test("normalizes masked and unmasked Brazilian phones equally", () => {
  assert.equal(phoneDigits("(34) 43434-3434"), phoneDigits("34434343434"))
})
