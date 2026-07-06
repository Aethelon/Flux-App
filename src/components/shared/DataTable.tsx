"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
}

export interface PaginationProps {
  page: number
  total: number
  perPage: number
  onChange: (page: number) => void
}

export interface TabItem {
  value: string
  label: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: keyof T
  pagination?: PaginationProps
  tabs?: TabItem[]
  activeTab?: string
  onTabChange?: (tab: string) => void
  actions?: React.ReactNode
  loading?: boolean
  emptyMessage?: string
  className?: string
}

function getNestedValue<T>(obj: T, key: string): unknown {
  return (obj as Record<string, unknown>)[key]
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  pagination,
  tabs,
  activeTab,
  onTabChange,
  actions,
  loading,
  emptyMessage = "Nenhum registro encontrado.",
  className,
}: DataTableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.perPage) : 1
  const start = pagination ? (pagination.page - 1) * pagination.perPage + 1 : 1
  const end = pagination ? Math.min(pagination.page * pagination.perPage, pagination.total) : data.length

  return (
    <div className={cn("rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden", className)}>
      {(tabs || actions) && (
        <div className="flex items-center justify-between gap-4 px-3 py-3 border-b border-(--color-border) bg-(--color-surface-raised)">
          {tabs && (
            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList className="bg-(--color-surface)">
                {tabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
        </div>
      )}

      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-(--color-border) hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.55px] text-(--color-text-secondary) font-(family-name:--font-data)",
                    col.className
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-(--color-border)">
                  {columns.map((col) => (
                    <TableCell key={String(col.key)}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-12 text-(--color-text-secondary) font-(family-name:--font-data)"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow
                  key={keyField ? String(getNestedValue(row, String(keyField))) : i}
                  className="border-(--color-border) hover:bg-(--color-surface-raised)/50 transition-colors"
                >
                  {columns.map((col) => (
                    <TableCell
                      key={String(col.key)}
                      className={cn(
                        "text-[14px] text-(--color-text-primary) font-(family-name:--font-data)",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String(getNestedValue(row, String(col.key)) ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-(--color-border) bg-(--color-surface-raised) text-[12px] text-(--color-text-secondary) font-(family-name:--font-data)">
          <span>
            Mostrando {start} a {end} de {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2 py-1 rounded disabled:opacity-40 hover:bg-(--color-surface-raised) transition-colors"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => pagination.onChange(p)}
                className={cn(
                  "px-2.5 py-1 rounded transition-colors",
                  p === pagination.page
                    ? "bg-(--color-accent) text-white"
                    : "hover:bg-(--color-surface-raised)"
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => pagination.onChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="px-2 py-1 rounded disabled:opacity-40 hover:bg-(--color-surface-raised) transition-colors"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
