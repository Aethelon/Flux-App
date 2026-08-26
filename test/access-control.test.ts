import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { canAccessRoute, canArchiveEmployee, getDefaultRoute, hasPermission } from "../src/lib/accessControl.ts"

void describe("employee action access control", () => {
  void it("hides archive for the authenticated employee", () => {
    assert.equal(canArchiveEmployee("current-user", "current-user"), false)
  })

  void it("allows archive for another employee", () => {
    assert.equal(canArchiveEmployee("current-user", "another-user"), true)
  })

  void it("keeps archive unavailable until the authenticated user loads", () => {
    assert.equal(canArchiveEmployee(undefined, "another-user"), false)
  })
})

void describe("cargo screen access control", () => {
  void it("allows a non-admin cargo to access a permitted area", () => {
    assert.equal(canAccessRoute("funcionario", "/historico", ["history.view"]), true)
    assert.equal(hasPermission("funcionario", ["orders.view"], "orders.view"), true)
  })

  void it("maps every configurable screen to its own access key", () => {
    const screens = [
      ["/dashboard", "dashboard.view"],
      ["/frente-de-caixa", "pos.view"],
      ["/ordens", "orders.view"],
      ["/caixa", "cash.view"],
      ["/inteligencia", "intelligence.view"],
      ["/inventario", "inventory.view"],
      ["/historico", "history.view"],
      ["/clientes", "customers.view"],
    ] as const

    for (const [route, permission] of screens) {
      assert.equal(canAccessRoute("funcionario", route, [permission]), true)
      assert.equal(canAccessRoute("funcionario", route, []), false)
    }
  })

  void it("keeps areas without a matching permission unavailable", () => {
    assert.equal(canAccessRoute("funcionario", "/dashboard", ["history.view"]), false)
    assert.equal(canAccessRoute("funcionario", "/funcionarios", ["history.view"]), false)
  })

  void it("keeps settings available without a cargo permission", () => {
    assert.equal(canAccessRoute("funcionario", "/configuracoes", []), true)
  })

  void it("uses the dashboard as the default only when the cargo can access it", () => {
    assert.equal(getDefaultRoute("funcionario", ["dashboard.view"]), "/dashboard")
    assert.equal(getDefaultRoute("funcionario", ["orders.view"]), "/ordens")
    assert.equal(getDefaultRoute("funcionario", []), "/sem-acesso")
  })
})
