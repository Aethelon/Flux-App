"use client"

import { useState } from "react"
import { Lock, Unlock } from "lucide-react"
import { SearchBar } from "./SearchBar"
import { DarkModeToggle } from "./DarkModeToggle"
import { UserMenu } from "./UserMenu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCaixaStore } from "@/store/caixaStore"
import {
  AbrirCaixaDialog,
  FecharCaixaDialog,
  ResumoFechamentoDialog,
  type ResumoFechamento,
} from "@/components/caixa/CaixaPanel"

// Status do caixa físico, sempre visível no header. Abre o diálogo de
// abertura ou fechamento conforme o estado atual, e — igual ao módulo de
// Caixa — mostra o relatório de conferência assim que o fechamento é
// confirmado, para o operador ver o resumo antes de seguir.
function CaixaStatusButton() {
  const caixaAberto = useCaixaStore((s) => s.sessaoAtual !== null)
  const [abrirOpen, setAbrirOpen] = useState(false)
  const [fecharOpen, setFecharOpen] = useState(false)
  const [resumoFechamento, setResumoFechamento] = useState<ResumoFechamento | null>(null)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => (caixaAberto ? setFecharOpen(true) : setAbrirOpen(true))}
        className={cn(
          "h-9 gap-1.5 rounded-full border text-[12px] font-medium",
          caixaAberto
            ? "border-(--color-success)/30 bg-(--color-success)/10 text-(--color-success) hover:bg-(--color-success)/15"
            : "border-(--color-warning)/30 bg-(--color-warning)/10 text-(--color-warning) hover:bg-(--color-warning)/15"
        )}
      >
        {caixaAberto ? <Unlock size={14} /> : <Lock size={14} />}
        {caixaAberto ? "Caixa aberto" : "Caixa fechado"}
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
  return (
    <header className="flex items-center justify-between h-18.5 px-10 bg-(--color-bg) shrink-0">
      <SearchBar />
      <div className="flex items-center gap-4 shrink-0">
        <CaixaStatusButton />
        <DarkModeToggle />
        <UserMenu />
      </div>
    </header>
  )
}