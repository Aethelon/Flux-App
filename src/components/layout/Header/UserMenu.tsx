"use client"

import { useRouter } from "next/navigation"
import { User, Settings, LogOut } from "lucide-react"
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    logout()
    router.push("/login")
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3.75 h-12.5 px-2 py-1 rounded-xl",
          "bg-(--color-surface-raised) transition-colors",
          "hover:bg-(--color-surface) cursor-pointer"
        )}
      >
        <div className="flex flex-col items-start pl-2">
          <span className="text-[14px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui) whitespace-nowrap leading-normal">
            {user.name}
          </span>
          <span className="text-[12px] font-medium text-(--color-text-secondary) font-(family-name:--font-ui) tracking-[-0.132px] whitespace-nowrap leading-4.5">
            {user.role === "admin" ? "Admin" : "Funcionário"}
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
          <User size={14} className="mr-2" /> Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
          <Settings size={14} className="mr-2" /> Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-(--color-text-danger) focus:text-(--color-text-danger)"
        >
          <LogOut size={14} className="mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
