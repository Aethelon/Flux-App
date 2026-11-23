"use client"

import { Search } from "lucide-react"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

interface TableSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function TableSearchInput({
  value,
  onChange,
  placeholder,
}: TableSearchInputProps) {
  const { locale } = useLocale()
  const label = placeholder ?? interfaceCopy[locale].searchName
  return (
    <div className="flex min-w-0 w-full items-center gap-2 rounded-md bg-(--color-surface) px-3 py-1.5 sm:w-56">
      <Search size={14} className="text-(--color-text-secondary) shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={label}
        className="min-w-0 flex-1 bg-transparent text-base text-(--color-text-primary) placeholder:text-(--color-text-secondary) outline-none font-(family-name:--font-data) sm:text-[12px]"
      />
    </div>
  )
}
