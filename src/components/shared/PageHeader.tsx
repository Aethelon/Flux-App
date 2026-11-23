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
        "mb-5 flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-2 sm:mb-8",
        className
      )}
    >
      <h1 className="min-w-0 wrap-anywhere text-3xl font-semibold leading-tight tracking-tight text-(--color-text-primary) font-(family-name:--font-ui) sm:text-[42px] lg:text-[56px] lg:tracking-[-2.24px]">
        {title}
      </h1>
      {(subtitle || children) && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:gap-4 sm:pb-2">
          {subtitle && (
            <p className="min-w-0 wrap-anywhere text-sm font-medium text-(--color-text-secondary) font-(family-name:--font-ui) sm:text-right sm:text-[18px]">
              {subtitle}
            </p>
          )}
          {children && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:gap-3">{children}</div>}
        </div>
      )}
    </div>
  )
}
