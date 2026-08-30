import ky, { type RetryOptions } from "ky"

export const idempotentGenerationRetry: RetryOptions = {
  limit: 1,
  methods: ["post"],
  statusCodes: [408, 500, 502, 504],
  retryOnTimeout: true,
}

export const api = ky.create({
  prefixUrl: "/api/backend",
  retry: {
    limit: 1,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
  timeout: 30_000,
  headers: {
    accept: "application/json",
  },
})

export function idempotencyHeaders(): Record<string, string> {
  return { "idempotency-key": crypto.randomUUID() }
}

interface ApiPage<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
}

export async function fetchAllPages<T>(
  path: string,
  searchParams: Record<string, string | number | boolean> = {},
  pageSize = 100,
): Promise<T[]> {
  const data: T[] = []
  let page = 1
  let total = 0

  do {
    const response = await api.get(path, {
      searchParams: { ...searchParams, page, pageSize },
    }).json<ApiPage<T>>()
    data.push(...response.data)
    total = response.total
    page += 1
    if (response.data.length === 0) break
  } while (data.length < total)

  return data
}
