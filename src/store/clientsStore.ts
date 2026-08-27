"use client"

import { create } from "zustand"
import { api, fetchAllPages, idempotencyHeaders } from "@/lib/api"
import { formatPhone, phoneDigits } from "@/lib/formatters"
import type { Client } from "@/types/client"

interface ApiCustomer {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: "active" | "inactive"
  version: number
  createdAt: string
}

function client(customer: ApiCustomer): Client {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email ?? "",
    phone: formatPhone(customer.phone ?? ""),
    status: customer.status === "active" ? "Ativo" : "Inativo",
    version: customer.version,
    createdAt: customer.createdAt,
  }
}

export interface NewClientInput {
  name: string
  email: string
  phone: string
  status: "Ativo" | "Inativo"
}

interface ClientsStore {
  clients: Client[]
  loadClients: () => Promise<void>
  addClient: (input: NewClientInput) => Promise<Client>
  updateClient: (id: string, input: NewClientInput) => Promise<void>
  removeClient: (id: string) => Promise<void>
}

let clientsLoadPromise: Promise<void> | null = null

export const useClientsStore = create<ClientsStore>((set, get) => ({
  clients: [],
  loadClients: () => {
    if (clientsLoadPromise) return clientsLoadPromise

    clientsLoadPromise = fetchAllPages<ApiCustomer>("customers")
      .then((response) => {
        set({ clients: response.map(client) })
      })
      .finally(() => {
        clientsLoadPromise = null
      })

    return clientsLoadPromise
  },
  addClient: async (input) => {
    const created = client(await api.post("customers", {
      headers: idempotencyHeaders(),
      json: {
        name: input.name,
        email: input.email || null,
        phone: phoneDigits(input.phone),
        status: input.status === "Ativo" ? "active" : "inactive",
      },
    }).json<ApiCustomer>())
    set((state) => ({ clients: [created, ...state.clients] }))
    return created
  },
  updateClient: async (id, input) => {
    const current = get().clients.find((item) => item.id === id)
    if (!current) return
    const updated = client(await api.patch(`customers/${id}`, {
      headers: idempotencyHeaders(),
      json: {
        version: current.version,
        name: input.name,
        email: input.email || null,
        phone: phoneDigits(input.phone),
        status: input.status === "Ativo" ? "active" : "inactive",
      },
    }).json<ApiCustomer>())
    set((state) => ({
      clients: state.clients.map((item) => item.id === id ? updated : item),
    }))
  },
  removeClient: async (id) => {
    const current = get().clients.find((item) => item.id === id)
    if (!current) return
    await api.delete(`customers/${id}`, {
      headers: idempotencyHeaders(),
      searchParams: { version: current.version },
    })
    set((state) => ({ clients: state.clients.filter((item) => item.id !== id) }))
  },
}))
