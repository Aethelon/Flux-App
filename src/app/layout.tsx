import type { Metadata } from "next"
import { Urbanist } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${urbanist.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
