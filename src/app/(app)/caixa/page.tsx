"use client"

import { PageHeader } from "@/components/shared/PageHeader"
import { CaixaPanel } from "@/components/caixa/CaixaPanel"
import { useLocale } from "@/components/layout/LocaleProvider"
import { cashMessages } from "@/components/caixa/messages"

export default function CaixaPage() {
  const { locale } = useLocale()
  const messages = cashMessages[locale]
  return (
    <div>
      <PageHeader
        title={messages.title}
        subtitle={messages.subtitle}
      />
      <CaixaPanel />
    </div>
  )
}
