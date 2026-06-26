import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusVariant = "success" | "warning" | "danger" | "neutral" | "info"

const STATUS_MAP: Record<string, StatusVariant> = {
  Ativo: "success",
  Inativo: "neutral",
  Pendente: "warning",
  "Em Andamento": "info",
  Concluído: "success",
  Cancelado: "danger",
  Esgotado: "danger",
  "Baixo estoque": "warning",
}

const VARIANT_STYLES: Record<StatusVariant, string> = {
  success: "bg-(--color-success)/15 text-(--color-success) border-(--color-success)/20",
  warning: "bg-(--color-warning)/15 text-(--color-warning) border-(--color-warning)/20",
  danger: "bg-(--color-danger)/15 text-(--color-danger) border-(--color-danger)/20",
  info: "bg-(--color-info)/15 text-(--color-info) border-(--color-info)/20",
  neutral: "bg-(--color-border)/40 text-(--color-text-secondary) border-(--color-border)",
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = STATUS_MAP[status] ?? "neutral"

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-semibold tracking-wide border font-(family-name:--font-data)",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {status}
    </Badge>
  )
}
