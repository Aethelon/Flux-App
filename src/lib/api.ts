import ky from "ky"

export const api = ky.create({
  prefixUrl: "/api/backend",
  retry: 0,
  timeout: 30_000,
  headers: {
    accept: "application/json",
  },
})

export function idempotencyHeaders(): Record<string, string> {
  return { "idempotency-key": crypto.randomUUID() }
}
