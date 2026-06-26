"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserStore } from "@/store/userStore"
import type { AuthUser } from "@/types/auth"
import { cn } from "@/lib/utils"

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const setUser = useUserStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const body = await res.json()

      if (!res.ok) {
        toast.error(body.message ?? "Credenciais inválidas")
        return
      }

      setUser(body.user as AuthUser)
      router.push(params.get("next") ?? "/dashboard")
    } catch {
      toast.error("Algo deu errado. Tente novamente.")
    }
  }

  return (
    <div className="min-h-screen flex bg-(--color-bg)">
      {/* Branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-(--color-surface) p-12 border-r border-(--color-border)">
        <div>
          <span className="text-[20px] font-black text-(--color-text-primary) font-(family-name:--font-ui)">
            Flux
          </span>
          <p className="text-[12px] font-medium text-(--color-text-secondary) font-(family-name:--font-ui)">
            Varejo &amp; Produção
          </p>
        </div>
        <blockquote className="space-y-2">
          <p className="text-[18px] font-medium text-(--color-text-primary) font-(family-name:--font-ui)">
            "Gestão inteligente para o seu negócio crescer com clareza."
          </p>
        </blockquote>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center flex-1 px-8 py-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-[32px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)">
              Entrar
            </h1>
            <p className="mt-1 text-[14px] text-(--color-text-secondary) font-(family-name:--font-ui)">
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-(--color-text-primary) font-(family-name:--font-ui)">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className={cn(errors.email && "border-(--color-danger)")}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[12px] text-(--color-danger)">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-(--color-text-primary) font-(family-name:--font-ui)">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn("pr-10", errors.password && "border-(--color-danger)")}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-secondary) hover:text-(--color-text-primary)"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[12px] text-(--color-danger)">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-(--color-accent) hover:bg-(--color-accent)/90 text-white font-semibold font-(family-name:--font-ui)"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
