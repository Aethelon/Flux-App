"use client"

import { create } from "zustand"
import type { Client } from "@/types/client"

// Status e última compra espelham o Histórico: quem tem compra registrada lá
// aparece aqui com a data da compra mais recente. Mariana é a única inativa —
// a última compra dela é anterior à janela exibida no Histórico.
const INITIAL_CLIENTS: Client[] = [
  { id: "1",  name: "Ana Silva",       email: "ana.silva@email.com",      phone: "(11) 98765-4321", status: "Ativo",   createdAt: "2023-01-10", lastPurchase: "Hoje" },
  { id: "2",  name: "Carlos Oliveira", email: "carlos.o@empresa.com.br",  phone: "(21) 99988-7766", status: "Ativo",   createdAt: "2023-02-05", lastPurchase: "Hoje" },
  { id: "3",  name: "Mariana Pereira", email: "mari.p@dominio.com",        phone: "(31) 97766-5544", status: "Inativo", createdAt: "2023-03-14", lastPurchase: "14 Mar 2026" },
  { id: "4",  name: "Rafael Ribeiro",  email: "rafael.ribeiro@email.com", phone: "(41) 98855-2211", status: "Ativo",   createdAt: "2023-04-22", lastPurchase: "Ontem" },
  { id: "5",  name: "Lucas Teixeira",  email: "lucas.tx@empresa.com",     phone: "(51) 99123-4567", status: "Ativo",   createdAt: "2023-05-01", lastPurchase: "Hoje" },
  { id: "6",  name: "Fernanda Costa",  email: "fe.costa@email.com",       phone: "(11) 91234-5678", status: "Ativo",   createdAt: "2023-06-10", lastPurchase: "Ontem" },
  { id: "7",  name: "Bruno Mendes",    email: "bruno.m@empresa.com.br",   phone: "(31) 92233-4455", status: "Ativo",   createdAt: "2023-07-14", lastPurchase: "Ontem" },
  { id: "8",  name: "Julia Santos",    email: "ju.santos@dominio.com",    phone: "(41) 93344-5566", status: "Ativo",   createdAt: "2023-08-22", lastPurchase: "Ontem" },
  { id: "9",  name: "Pedro Alves",     email: "pedro.a@empresa.com",      phone: "(51) 94455-6677", status: "Ativo",   createdAt: "2023-09-01", lastPurchase: "07 Jul 2026" },
  { id: "10", name: "Camila Rocha",    email: "camila.r@email.com",       phone: "(21) 95566-7788", status: "Ativo",   createdAt: "2023-10-14", lastPurchase: "05 Jul 2026" },
]

export interface NewClientInput {
  name: string
  email: string
  phone: string
  status: "Ativo" | "Inativo"
}

interface ClientsStore {
  clients: Client[]
  addClient: (input: NewClientInput) => Client
  updateClient: (id: string, input: NewClientInput) => void
  removeClient: (id: string) => void
}

export const useClientsStore = create<ClientsStore>((set) => ({
  clients: INITIAL_CLIENTS,
  addClient: (input) => {
    const client: Client = {
      id: String(Date.now()),
      ...input,
      createdAt: new Date().toISOString().slice(0, 10),
      lastPurchase: "—",
    }
    set((state) => ({ clients: [client, ...state.clients] }))
    return client
  },
  updateClient: (id, input) =>
    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? { ...c, ...input } : c)),
    })),
  removeClient: (id) =>
    set((state) => ({ clients: state.clients.filter((c) => c.id !== id) })),
}))
