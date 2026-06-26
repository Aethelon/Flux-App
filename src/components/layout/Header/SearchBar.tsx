"use client"

import { Search } from "lucide-react"
import { useEffect, useState } from "react"
import { SearchModal } from "@/components/search/SearchModal"

export function SearchBar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 h-[50px] flex-1 max-w-xl px-4 rounded-xl
          bg-(--color-surface) border border-(--color-border)
          text-(--color-text-secondary) text-[14px] font-semibold
          font-(family-name:--font-ui) hover:border-(--color-accent)/50
          transition-colors"
      >
        <Search size={16} />
        <span>Pesquisar configurações...</span>
        <span className="ml-auto text-[11px] font-normal opacity-60">⌘K</span>
      </button>

      <SearchModal open={open} onOpenChange={setOpen} />
    </>
  )
}
