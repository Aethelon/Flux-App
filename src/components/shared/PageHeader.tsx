import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-12", className)}>
      <div>
        <h1 className="text-[56px] font-semibold leading-17.5 tracking-[-2.24px] text-(--color-text-primary) font-(family-name:--font-ui)">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[18px] font-medium text-(--color-text-secondary) font-(family-name:--font-ui)">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3 mt-4">{children}</div>}
    </div>
  )
}
