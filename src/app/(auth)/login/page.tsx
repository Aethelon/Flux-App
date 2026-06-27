"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react"
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

  const inputCls = cn(
    "bg-[#f3f3f5] rounded-lg p-4 w-full",
    "text-[16px] font-semibold text-[#1a1c1d] font-(family-name:--font-ui)",
    "placeholder:text-[#767684] placeholder:opacity-60",
    "outline-none focus:ring-2 focus:ring-[#4450b7]/30 transition-shadow"
  )

  return (
    <div className="min-h-screen flex">
      {/* ── Left Branding Panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-16"
        style={{
          backgroundColor: "#f3f3f5",
          backgroundImage: "radial-gradient(circle, rgba(68,80,183,0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* Logo */}
        <span className="text-[32px] font-bold text-[#1a1c1d] font-(family-name:--font-ui) tracking-[-0.5px] leading-7">
          Flux
        </span>

        {/* Branding copy */}
        <div className="flex flex-col gap-6 max-w-lg pb-24">
          <div className="flex items-center gap-2 w-fit bg-white border border-[rgba(198,197,213,0.2)] rounded-xl px-3.25 py-1.75 shadow-[0px_4px_12px_rgba(29,29,31,0.02)]">
            <div className="size-2 rounded-full bg-[#4450b7] shrink-0" />
            <span className="text-[12px] font-semibold text-[#4450b7] uppercase tracking-[1.2px] leading-4 font-(family-name:--font-ui)">
              Inicialização do Sistema
            </span>
          </div>

          <div className="text-[56px] font-black text-[#4450b7] uppercase leading-[61.6px] font-(family-name:--font-ui)">
            <p>Projete Suas</p>
            <p>Operações</p>
          </div>

          <p className="text-[18px] font-semibold text-[#454652] leading-[29.25px] font-(family-name:--font-ui)">
            Estabeleça um plano de controle de precisão para sua empresa. Sintetize dados, gerencie fluxos de trabalho e opere com clareza cristalina.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-[#767684] leading-5 font-(family-name:--font-ui)">
            © 2026 Aethelon Tech.
          </span>
          <span className="text-[14px] font-semibold text-[#767684] leading-5 font-(family-name:--font-ui)">
            v1.0
          </span>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex items-center justify-center bg-[#e3e2e3] p-16 w-full lg:w-175 shrink-0 shadow-[-20px_0px_20px_rgba(29,29,31,0.02)]">
        <div className="flex flex-col gap-8 w-full max-w-105">
          {/* Form header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-[56px] font-semibold text-[#1a1c1d] tracking-[-2.24px] leading-17.5 font-(family-name:--font-ui)">
              Entrar na conta
            </h1>
            <p className="text-[18px] font-medium text-[#454652] leading-5.25 font-(family-name:--font-ui)">
              Insira suas credenciais para entrar em sua conta
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 pt-2">
            <div className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-[#454652] uppercase tracking-[0.6px] leading-4 font-(family-name:--font-ui)">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. JaneDoe@gmail.com"
                  autoComplete="email"
                  {...register("email")}
                  className={cn(inputCls, errors.email && "ring-2 ring-red-400")}
                />
                {errors.email && (
                  <p className="text-[12px] text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-[#454652] uppercase tracking-[0.6px] leading-4 font-(family-name:--font-ui)">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                    className={cn(inputCls, "pr-12", errors.password && "ring-2 ring-red-400")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#767684] hover:text-[#454652]"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[12px] text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 w-full py-3.75 px-4 rounded-lg text-[16px] font-semibold text-white font-(family-name:--font-ui) border-t border-white/20 shadow-[0px_2px_4px_rgba(68,80,183,0.25)] disabled:opacity-70 transition-opacity"
              style={{ backgroundImage: "linear-gradient(172.8deg, #4450b7 0%, #5e6ad2 100%)" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar na conta
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
