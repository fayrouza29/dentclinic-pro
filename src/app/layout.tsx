import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { CABINET } from "@/lib/cabinet"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: CABINET.appName,
  description: `Plateforme de gestion de cabinet dentaire - ${CABINET.nom}`,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: CABINET.appName,
  },
}

export const viewport: Viewport = {
  themeColor: "#0EA5E9",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="dentcare-theme"
        >
          {children}
        </ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
