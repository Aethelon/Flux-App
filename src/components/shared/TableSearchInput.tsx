"use client"

import { Search } from "lucide-react"

interface TableSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function TableSearchInput({
  value,
  onChange,
  placeholder = "Buscar por nome...",
}: TableSearchInputProps) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-(--color-surface) px-3 py-1.5 w-56">
      <Search size={14} className="text-(--color-text-secondary) shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[12px] text-(--color-text-primary) placeholder:text-(--color-text-secondary) outline-none font-(family-name:--font-data)"
      />
    </div>
  )
}
