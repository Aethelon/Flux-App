"use client"

import Link from "next/link"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

export default function NotFound() {
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-(--color-bg) px-4 text-center">
      <h1 className="text-[56px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)">
        404
      </h1>
      <p className="text-[18px] text-(--color-text-secondary) font-(family-name:--font-ui)">
        {copy.notFound}
      </p>
      <Link
        href="/dashboard"
        className="text-(--color-accent) hover:underline font-(family-name:--font-ui)"
      >
        {copy.backToDashboard}
      </Link>
    </div>
  )
}
