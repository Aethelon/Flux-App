"use client"

import { ShieldAlert } from "lucide-react"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

export default function SemAcessoPage() {
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-(--color-warning)/10 text-(--color-warning)">
          <ShieldAlert size={22} />
        </div>
        <h1 className="text-xl font-semibold text-(--color-text-primary)">{copy.noAccess}</h1>
        <p className="text-sm text-(--color-text-secondary)">
          {copy.noAccessDetails}
        </p>
      </div>
    </div>
  )
}
