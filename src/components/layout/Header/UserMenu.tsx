"use client"

import { useRouter } from "next/navigation"
import { ChevronDown, User, Settings, LogOut } from "lucide-react"
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
          "flex items-center gap-[15px] h-[50px] px-2 py-1 rounded-xl",
          "bg-(--color-surface-raised) border border-(--color-border)",
          "hover:border-(--color-accent)/50 transition-colors"
        )}
      >
        <Avatar className="w-9 h-9 rounded-lg">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="rounded-lg bg-(--color-accent) text-white text-[13px] font-semibold">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[13px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)">
            {user.name}
          </span>
          <span className="text-[12px] font-medium text-(--color-text-secondary) font-(family-name:--font-ui)">
            {user.role === "admin" ? "Administrador" : "Funcionário"}
          </span>
        </div>
        <ChevronDown size={14} className="text-(--color-text-secondary) ml-1" />
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
