import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mb-8",
        className
      )}
    >
      <h1 className="text-[56px] font-semibold leading-tight tracking-[-2.24px] text-(--color-text-primary) font-(family-name:--font-ui)">
        {title}
      </h1>
      {(subtitle || children) && (
        <div className="flex items-center gap-4 ml-auto pb-2">
          {subtitle && (
            <p className="text-[18px] font-medium text-(--color-text-secondary) text-right font-(family-name:--font-ui)">
              {subtitle}
            </p>
          )}
          {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
      )}
    </div>
  )
}
