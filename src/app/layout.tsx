import type { Metadata } from "next"
import { Urbanist } from "next/font/google"
import { cookies } from "next/headers"
import { ThemeProvider } from "next-themes"
import { LocaleProvider } from "@/components/layout/LocaleProvider"
import { Toaster } from "@/components/ui/sonner"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/locale"
import "./globals.css"

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Flux — Varejo & Produção",
  description: "Sistema de gestão de varejo e produção",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const savedLocale = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(savedLocale) ? savedLocale : DEFAULT_LOCALE

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${urbanist.variable} antialiased`}>
        <LocaleProvider initialLocale={locale}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            {children}
            <Toaster />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
