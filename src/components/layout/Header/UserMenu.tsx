"use client"

import { useRouter } from "next/navigation"
import { Settings, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserStore } from "@/store/userStore"
import { cn } from "@/lib/utils"
import { useLocale } from "../LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function UserMenu() {
  const router = useRouter()
  const { user, logout } = useUserStore()
  const { locale } = useLocale()
  const copy = interfaceCopy[locale]

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    logout()
    router.push("/login")
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={copy.account}
        className={cn(
          "flex size-11 items-center justify-center gap-3.75 rounded-xl lg:h-12.5 lg:w-auto lg:px-2 lg:py-1",
          "bg-(--color-surface-raised) transition-colors",
          "hover:bg-(--color-surface) cursor-pointer"
        )}
      >
        <div className="hidden max-w-44 min-w-0 flex-col items-start pl-2 lg:flex">
          <span className="max-w-full truncate text-[14px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui) leading-normal">
            {user.name}
          </span>
          <span className="max-w-full truncate text-[12px] font-medium text-(--color-text-secondary) font-(family-name:--font-ui) tracking-[-0.132px] leading-4.5">
            {user.jobRole?.name ?? (user.role === "admin" ? copy.admin : copy.operator)}
          </span>
        </div>
        <Avatar className="w-9 h-9 rounded-md shrink-0">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="rounded-md bg-(--color-accent) text-white text-[13px] font-semibold">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
          <Settings size={14} className="mr-2" /> {copy.settings}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-(--color-text-danger) focus:text-(--color-text-danger)"
        >
          <LogOut size={14} className="mr-2" /> {copy.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
