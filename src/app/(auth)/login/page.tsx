"use client"

import { Suspense, useState, useSyncExternalStore } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react"
import { useUserStore } from "@/store/userStore"
import type { AuthUser } from "@/types/auth"
import { cn } from "@/lib/utils"
import { canAccessRoute, getDefaultRoute } from "@/lib/accessControl"
import { DarkModeToggle } from "@/components/layout/Header/DarkModeToggle"
import { FluxMark } from "@/components/brand/FluxMark"
import { useLocale } from "@/components/layout/LocaleProvider"
import { interfaceCopy } from "@/lib/interfaceCopy"

const loginCopy = {
  "pt-BR": {
    title: "Entrar na conta",
    instructions: "Insira suas credenciais para entrar em sua conta",
    email: "E-mail",
    invalidEmail: "E-mail inválido",
    passwordRequired: "Senha obrigatória",
    invalidCredentials: "Credenciais inválidas",
    unexpectedError: "Algo deu errado. Tente novamente.",
    submitting: "Entrando...",
    system: "Inicialização do Sistema",
    headline: "Projete Suas Operações",
    description: "Estabeleça um plano de controle de precisão para sua empresa. Sintetize dados, gerencie fluxos de trabalho e opere com clareza cristalina.",
  },
  "en-US": {
    title: "Sign in",
    instructions: "Enter your credentials to sign in to your account",
    email: "Email",
    invalidEmail: "Enter a valid email address",
    passwordRequired: "Enter your password",
    invalidCredentials: "Invalid credentials",
    unexpectedError: "Something went wrong. Try again.",
    submitting: "Signing in...",
    system: "System Access",
    headline: "Plan Your Operations",
    description: "Bring your business data together, manage workflows, and see how your operations are running.",
  },
  es: {
    title: "Iniciar sesión",
    instructions: "Ingresa tus credenciales para acceder a tu cuenta",
    email: "Correo electrónico",
    invalidEmail: "Ingresa un correo electrónico válido",
    passwordRequired: "Ingresa tu contraseña",
    invalidCredentials: "Credenciales no válidas",
    unexpectedError: "Algo salió mal. Inténtalo de nuevo.",
    submitting: "Iniciando sesión...",
    system: "Acceso al sistema",
    headline: "Planifica tus operaciones",
    description: "Reúne los datos de tu negocio, administra los flujos de trabajo y consulta el estado de tus operaciones.",
  },
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const setUser = useUserStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const { locale } = useLocale()
  const copy = loginCopy[locale]
  const labels = interfaceCopy[locale]
  const schema = z.object({
    email: z.string().email(copy.invalidEmail),
    password: z.string().min(1, copy.passwordRequired),
  })
  type FormData = z.infer<typeof schema>

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
        toast.error(locale === "pt-BR" ? body.message ?? copy.invalidCredentials : copy.invalidCredentials)
        return
      }
      const user = body.user as AuthUser
      const next = params.get("next")
      setUser(user)
      router.push(next && canAccessRoute(user.role, next, user.permissions) ? next : getDefaultRoute(user.role, user.permissions))
    } catch {
      toast.error(copy.unexpectedError)
    }
  }

  const inputCls = cn(
    "bg-(--color-bg) rounded-lg p-4 w-full",
    "text-[16px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)",
    "placeholder:text-(--color-text-secondary) placeholder:opacity-60",
    "outline-none focus:ring-2 focus:ring-[#4450b7]/30 transition-shadow"
  )

  return (
    <div className="relative flex min-h-dvh bg-(--color-bg)">
      <div className="absolute right-3 top-3 z-10 sm:right-6 sm:top-6">
        <DarkModeToggle />
      </div>

      {/* ── Left Branding Panel ── */}
      <div
        className="hidden min-w-0 flex-1 flex-col justify-between p-9 lg:flex xl:p-16"
        style={{
          backgroundColor: "var(--color-bg)",
          backgroundImage: "radial-gradient(circle, rgba(68,80,183,0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-(--color-accent) text-white shadow-(--shadow-logo)">
            <FluxMark className="size-6" />
          </span>
          <span className="text-[32px] font-bold text-(--color-text-primary) font-(family-name:--font-ui) tracking-[-0.5px] leading-7">
            Flux
          </span>
        </div>

        {/* Branding copy */}
        <div className="flex flex-col gap-6 max-w-lg pb-24">
          <div className="flex items-center gap-2 w-fit bg-(--color-surface) border border-(--color-border) rounded-xl px-3.25 py-1.75 shadow-[0px_4px_12px_rgba(29,29,31,0.02)]">
            <div className="size-2 rounded-full bg-[#4450b7] shrink-0" />
            <span className="text-[12px] font-semibold text-[#4450b7] uppercase tracking-[1.2px] leading-4 font-(family-name:--font-ui)">
              {copy.system}
            </span>
          </div>

          <p className="text-4xl font-black uppercase leading-tight text-[#4450b7] font-(family-name:--font-ui) xl:text-[56px]">{copy.headline}</p>

          <p className="text-[18px] font-semibold text-(--color-text-secondary) leading-[29.25px] font-(family-name:--font-ui)">
            {copy.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-(--color-text-secondary) leading-5 font-(family-name:--font-ui)">
            © 2026 Aethelon Tech.
          </span>
          <span className="text-[14px] font-semibold text-(--color-text-secondary) leading-5 font-(family-name:--font-ui)">
            v1.0
          </span>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex w-full shrink-0 items-center justify-center bg-(--color-surface-raised) px-4 py-16 shadow-[-20px_0px_20px_rgba(29,29,31,0.02)] sm:px-10 lg:w-[min(52%,43.75rem)] lg:p-10 xl:p-16">
        <div className="flex w-full max-w-105 min-w-0 flex-col gap-6 sm:gap-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-(--color-accent) text-white">
              <FluxMark className="size-5" />
            </span>
            <span className="text-xl font-black">Flux</span>
          </div>
          {/* Form header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-(--color-text-primary) font-(family-name:--font-ui) sm:text-[46px] xl:text-[56px]">
              {copy.title}
            </h1>
            <p className="text-sm font-medium text-(--color-text-secondary) font-(family-name:--font-ui) sm:text-lg">
              {copy.instructions}
            </p>
          </div>

          {/* Form */}
          <form method="post" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 pt-2">
            <div className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label htmlFor="login-email" className="text-[14px] font-semibold text-(--color-text-secondary) uppercase tracking-[0.6px] leading-4 font-(family-name:--font-ui)">
                  {copy.email}
                </label>
                <input
                  type="email"
                  id="login-email"
                  placeholder="email@example.com"
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
                <label htmlFor="login-password" className="text-[14px] font-semibold text-(--color-text-secondary) uppercase tracking-[0.6px] leading-4 font-(family-name:--font-ui)">
                  {labels.password}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                    className={cn(inputCls, "pr-12", errors.password && "ring-2 ring-red-400")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-(--color-text-secondary) hover:text-(--color-text-primary)"
                    aria-label={showPassword ? labels.hidePassword : labels.showPassword}
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
              disabled={!mounted || isSubmitting}
              className="flex items-center justify-center gap-2 w-full py-3.75 px-4 rounded-lg text-[16px] font-semibold text-white font-(family-name:--font-ui) border-t border-white/20 shadow-[0px_2px_4px_rgba(68,80,183,0.25)] disabled:opacity-70 transition-opacity"
              style={{ backgroundImage: "linear-gradient(172.8deg, #4450b7 0%, #5e6ad2 100%)" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {copy.submitting}
                </>
              ) : (
                <>
                  {copy.title}
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
