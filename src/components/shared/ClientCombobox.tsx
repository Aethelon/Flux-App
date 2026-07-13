"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useClientsStore } from "@/store/clientsStore"
import { ClientFormDialog } from "./ClientFormDialog"

export function ClientCombobox({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (name: string) => void
}) {
  const clients = useClientsStore((s) => s.clients)
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const query = value.trim().toLowerCase()
  const filtered = query
    ? clients.filter((c) => c.name.toLowerCase().includes(query))
    : clients

  return (
    <div className="relative">
      <Input
        id={id}
        placeholder="Buscar ou digitar cliente"
        value={value}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />

      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-(--color-border) bg-popover p-1 shadow-md ring-1 ring-foreground/10">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(c.name); setOpen(false) }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-(--color-surface-raised)"
            >
              <span className="text-[13px] text-(--color-text-primary)">{c.name}</span>
              <span className="shrink-0 text-[11px] text-(--color-text-secondary)">{c.email}</span>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="px-2 py-1.5 text-[13px] text-(--color-text-secondary)">
              Nenhum cliente encontrado
            </div>
          )}

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setOpen(false); setAddOpen(true) }}
            className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-(--color-border) px-2 py-1.5 text-left text-[13px] text-(--color-accent) hover:bg-(--color-surface-raised)"
          >
            <Plus size={14} />
            Adicionar cliente
          </button>
        </div>
      )}

      <ClientFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialName={value}
        onCreated={(client) => onChange(client.name)}
      />
    </div>
  )
}
