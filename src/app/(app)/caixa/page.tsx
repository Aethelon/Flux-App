import { PageHeader } from "@/components/shared/PageHeader"
import { CaixaPanel } from "@/components/caixa/CaixaPanel"

export default function CaixaPage() {
  return (
    <div>
      <PageHeader
        title="Caixa"
        subtitle="Abertura, fechamento, sangria, suprimento e vendas em dinheiro"
      />
      <CaixaPanel />
    </div>
  )
}
