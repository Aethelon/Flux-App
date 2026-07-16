"use client"

import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Command as CommandPrimitive } from "cmdk"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { buildSearchIndex, searchItems } from "@/lib/searchIndex"
import { useClientsStore } from "@/store/clientsStore"

export function SearchBar() {
  const router = useRouter()
  const clients = useClientsStore((s) => s.clients)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const groups = useMemo(
    () => searchItems(buildSearchIndex(clients), query),
    [clients, query]
  )
  const showResults = open && query.trim().length > 0

  // ⌘K foca a barra (antes abria um modal separado).
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  // Clique fora fecha o dropdown sem limpar o termo digitado.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleSelect(href: string) {
    setOpen(false)
    setQuery("")
    inputRef.current?.blur()
    router.push(href)
  }

  return (
    <Command
      ref={containerRef}
      // A filtragem é feita em searchItems (limite por grupo e busca sem acento).
      shouldFilter={false}
      // size-auto anula o size-full do Command: a altura vem da barra, que o
      // header então centraliza (senão ela gruda no topo).
      className="relative size-auto flex-1 max-w-160 overflow-visible bg-transparent p-0"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false)
          inputRef.current?.blur()
        }
      }}
    >
      <div
        className="flex items-center gap-3 h-12.5 px-4 rounded-xl
          bg-(--color-surface) transition-colors
          focus-within:bg-(--color-surface-raised) hover:bg-(--color-surface-raised)"
      >
        <Search size={16} className="shrink-0 text-(--color-text-secondary)" />
        <CommandPrimitive.Input
          ref={inputRef}
          value={query}
          onValueChange={(value) => {
            setQuery(value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Pesquisar produtos, clientes, ordens..."
          className="w-full bg-transparent outline-none
            text-(--color-text-primary) text-[14px] font-semibold
            font-(family-name:--font-ui)
            placeholder:text-(--color-text-secondary)"
        />
        <span className="shrink-0 text-[11px] text-(--color-text-secondary) opacity-60">
          ⌘K
        </span>
      </div>

      {showResults && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden
            rounded-xl border border-(--color-border)
            bg-(--color-surface-raised) shadow-lg"
        >
          <CommandList className="max-h-96 p-1">
            {groups.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-(--color-text-secondary)">
                Nenhum resultado para “{query}”.
              </p>
            ) : (
              groups.map((group) => (
                <CommandGroup key={group.group} heading={group.group}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item.href)}
                      className="cursor-pointer"
                    >
                      <item.icon
                        size={16}
                        className="mr-2 shrink-0 text-(--color-text-secondary)"
                      />
                      <span className="truncate">{item.label}</span>
                      {item.description && (
                        <span className="ml-auto shrink-0 pl-3 text-xs text-(--color-text-secondary)">
                          {item.description}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </div>
      )}
    </Command>
  )
}
