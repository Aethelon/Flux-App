import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-(--color-bg)">
      <h1 className="text-[56px] font-semibold text-(--color-text-primary) font-(family-name:--font-ui)">
        404
      </h1>
      <p className="text-[18px] text-(--color-text-secondary) font-(family-name:--font-ui)">
        Página não encontrada
      </p>
      <Link
        href="/dashboard"
        className="text-(--color-accent) hover:underline font-(family-name:--font-ui)"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  )
}
