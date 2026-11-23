"use client"

import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { interfaceCopy } from "@/lib/interfaceCopy"
import { useSidebarStore } from "@/store/sidebarStore"
import { FluxMark } from "@/components/brand/FluxMark"
import { useLocale } from "@/components/layout/LocaleProvider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SidebarNav } from "./SidebarNav"
import { SidebarFooter } from "./SidebarFooter"

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { collapsed: desktopCollapsed, toggle } = useSidebarStore()
  const collapsed = !mobile && desktopCollapsed
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]

  return (
    <aside
      className={cn(
        "flex-col shrink-0 bg-(--color-bg)",
        mobile
          ? "flex h-full w-full"
          : cn("hidden h-dvh border-r border-(--color-surface) transition-[width] duration-200 lg:flex",
            collapsed ? "w-19.25" : "w-64")
      )}
    >
      <div
        className={cn(
          "flex items-center pb-6 pt-6 shrink-0 transition-all duration-200",
          collapsed ? "pl-4.5" : "px-6 gap-1"
        )}
      >
        <div className="size-10 rounded-[12px] bg-(--color-accent) flex items-center justify-center shrink-0 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
          <FluxMark className="size-6 text-white" />
        </div>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            collapsed ? "max-w-0 opacity-0" : "max-w-50 opacity-100"
          )}
        >
          <div className="flex flex-col pl-2.5 whitespace-nowrap">
            <span className="text-[20px] font-black text-(--color-text-primary) font-(family-name:--font-ui) leading-none">
              Flux
            </span>
            <span className="text-[12px] font-medium text-(--color-text-secondary) font-(family-name:--font-ui) leading-4">
              {copy.brand}
            </span>
          </div>
        </div>
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      <SidebarFooter collapsed={collapsed} onToggle={mobile ? undefined : toggle} onNavigate={onNavigate} />
    </aside>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)")
    function closeOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false)
    }
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon" className="size-11" aria-label={copy.openMenu} />}>
        <Menu className="size-5" />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh w-[min(18rem,calc(100%-2rem))] max-w-none max-h-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{copy.navigation}</DialogTitle>
        <DialogClose render={<Button type="button" variant="ghost" size="icon" className="absolute top-4 right-3 z-10 size-11" aria-label={copy.closeMenu} />}>
          <X className="size-5" />
        </DialogClose>
        <Sidebar mobile onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
