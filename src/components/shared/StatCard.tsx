import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: string
    positive?: boolean
  }
  className?: string
  valueClassName?: string
}

export function StatCard({ label, value, icon: Icon, trend, className, valueClassName }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-5 rounded-md",
        "bg-(--color-surface) border border-(--color-border)",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)">
          {label}
        </span>
        {Icon && <Icon size={16} className="text-(--color-text-secondary)" />}
      </div>

      <span
        className={cn(
          "text-[24px] font-semibold leading-9 tracking-[-0.48px] text-(--color-text-primary) font-(family-name:--font-data)",
          valueClassName
        )}
      >
        {value}
      </span>

      {trend && (
        <span
          className={cn(
            "text-[12px] font-medium font-(family-name:--font-data)",
            trend.positive ? "text-(--color-success)" : "text-(--color-danger)"
          )}
        >
          {trend.value}
        </span>
      )}
    </div>
  )
}
