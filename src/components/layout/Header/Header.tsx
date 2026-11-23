"use client"

import { useEffect, useState } from "react"
import { Lock, Unlock } from "lucide-react"
import { MobileSidebar } from "../Sidebar/Sidebar"
import { useLocale } from "../LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"
import { SearchBar } from "./SearchBar"
import { DarkModeToggle } from "./DarkModeToggle"
import { UserMenu } from "./UserMenu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCaixaStore } from "@/store/caixaStore"
import { useUserStore } from "@/store/userStore"
import { hasPermission } from "@/lib/accessControl"
import {
  AbrirCaixaDialog,
  FecharCaixaDialog,
  ResumoFechamentoDialog,
  type ResumoFechamento,
} from "@/components/caixa/CaixaPanel"

// Status do caixa físico. Abre o diálogo de
// abertura ou fechamento conforme o estado atual, e — igual ao módulo de
// Caixa — mostra o relatório de conferência assim que o fechamento é
// confirmado, para o operador ver o resumo antes de seguir.
function CaixaStatusButton() {
  const caixaAberto = useCaixaStore((s) => s.sessaoAtual !== null)
  const loadCash = useCaixaStore((s) => s.loadCash)
  const [abrirOpen, setAbrirOpen] = useState(false)
  const [fecharOpen, setFecharOpen] = useState(false)
  const [resumoFechamento, setResumoFechamento] = useState<ResumoFechamento | null>(null)
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]
  const label = caixaAberto ? copy.cashOpen : copy.cashClosed

  useEffect(() => {
    void loadCash().catch(() => undefined)
  }, [loadCash])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-label={label}
        onClick={() => (caixaAberto ? setFecharOpen(true) : setAbrirOpen(true))}
        className={cn(
          "size-11 gap-1.5 rounded-full border text-[12px] font-medium lg:h-9 lg:w-auto",
          caixaAberto
            ? "border-(--color-success)/30 bg-(--color-success)/10 text-(--color-success) hover:bg-(--color-success)/15"
            : "border-(--color-warning)/30 bg-(--color-warning)/10 text-(--color-warning) hover:bg-(--color-warning)/15"
        )}
      >
        {caixaAberto ? <Unlock size={14} /> : <Lock size={14} />}
        <span className="hidden lg:inline">{label}</span>
      </Button>

      <AbrirCaixaDialog open={abrirOpen} onOpenChange={setAbrirOpen} />
      <FecharCaixaDialog
        open={fecharOpen}
        onOpenChange={setFecharOpen}
        onFechamentoConfirmado={setResumoFechamento}
      />
      <ResumoFechamentoDialog
        resumo={resumoFechamento}
        onOpenChange={() => setResumoFechamento(null)}
      />
    </>
  )
}

export function Header() {
  const user = useUserStore((state) => state.user)
  const canUseCash = hasPermission(user?.role, user?.permissions, "cash.view")
    || hasPermission(user?.role, user?.permissions, "pos.view")

  return (
    <header className="relative z-20 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 bg-(--color-bg) px-3 py-2 sm:px-6 lg:flex lg:h-18.5 lg:justify-between lg:gap-4 lg:px-10 lg:py-0">
      <div className="flex min-w-0 items-center gap-1 lg:hidden">
        <MobileSidebar />
        <span className="text-xl font-black text-(--color-text-primary)">Flux</span>
      </div>
      <div className="col-span-2 row-start-2 min-w-0 lg:flex-1">
        <SearchBar />
      </div>
      <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
        {canUseCash && <CaixaStatusButton />}
        <DarkModeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
