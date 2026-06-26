"use client"

import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { searchIndex } from "@/lib/searchIndex"

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES = ["Páginas", "Ações", "Configurações"] as const

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const router = useRouter()

  function handleSelect(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  const byCategory = CATEGORIES.map((cat) => ({
    label: cat,
    items: searchIndex.filter((item) => item.category === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Pesquisar páginas e ações..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {byCategory.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={item.href}
                value={[item.label, ...item.keywords].join(" ")}
                onSelect={() => handleSelect(item.href)}
              >
                <item.icon className="mr-2 shrink-0" size={16} />
                <span>{item.label}</span>
                {item.description && (
                  <span className="ml-auto text-xs text-(--color-text-secondary)">
                    {item.description}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
