"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useClientsStore } from "@/store/clientsStore"
import { ClientFormDialog } from "./ClientFormDialog"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

export function ClientCombobox({
  id,
  value,
  onChange,
  // "up" abre o dropdown acima do campo — útil quando o combobox fica no rodapé
  // de um container com rolagem, para não empurrar o conteúdo nem gerar scroll.
  align = "down",
  disabled = false,
}: {
  id?: string
  value: string
  onChange: (name: string) => void
  align?: "down" | "up"
  disabled?: boolean
}) {
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]
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
          placeholder={copy.clientSearch}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />

      {open && !disabled && (
        <div
          className={cn(
            "absolute z-50 max-h-56 w-full overflow-y-auto rounded-lg border border-(--color-border) bg-popover p-1 shadow-md ring-1 ring-foreground/10",
            align === "up" ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(c.name); setOpen(false) }}
              className="flex w-full min-w-0 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-(--color-surface-raised) sm:flex-row sm:items-center sm:justify-between sm:gap-2"
            >
              <span className="max-w-full wrap-anywhere text-[13px] text-(--color-text-primary)">{c.name}</span>
              <span className="max-w-full wrap-anywhere text-[11px] text-(--color-text-secondary) sm:max-w-[50%]">{c.email}</span>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="px-2 py-1.5 text-[13px] text-(--color-text-secondary)">
              {copy.noClients}
            </div>
          )}

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setOpen(false); setAddOpen(true) }}
            className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-(--color-border) px-2 py-1.5 text-left text-[13px] text-(--color-accent) hover:bg-(--color-surface-raised)"
          >
            <Plus size={14} />
            {copy.addClient}
          </button>
        </div>
      )}

      <ClientFormDialog
        key={addOpen ? `open-${value}` : "closed"}
        open={addOpen}
        onOpenChange={setAddOpen}
        initialName={value}
        onCreated={(client) => onChange(client.name)}
      />
    </div>
  )
}
