"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Calendar, Home, LogOut, Users } from "lucide-react"
import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { CABINET } from "@/lib/cabinet"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/rendez-vous", label: "Rendez-vous", icon: Calendar },
]

export function DentisteSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <aside
      className="animate-slide-in fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r px-5 py-6 shadow-sm backdrop-blur lg:flex"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
    >
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 p-4 text-white">
        <div className="rounded-xl bg-white/15 p-2">
          <Logo size={34} showText={false} />
        </div>
        <p className="mt-3 text-xs uppercase tracking-wide text-white/90">{CABINET.appName}</p>
        <p className="text-sm font-semibold text-white">{CABINET.nom}</p>
      </div>

      <nav className="space-y-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                "text-[color:var(--text-secondary)] hover:bg-blue-50 hover:text-[color:var(--text-primary)] dark:hover:bg-slate-700/50",
                active && "rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-600 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto">
        <div
          className="mb-3 rounded-xl border p-3 text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <p>{CABINET.telephone}</p>
          <p>{CABINET.email}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          style={{
            borderColor: "var(--border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
          }}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </aside>
  )
}
