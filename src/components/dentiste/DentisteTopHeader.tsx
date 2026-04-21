"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Bell, LogOut } from "lucide-react"
import { Logo } from "@/components/Logo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { CABINET } from "@/lib/cabinet"
import { supabase } from "@/lib/supabase"

type Profil = {
  nom: string | null
  prenom: string | null
}

export function DentisteTopHeader() {
  const pathname = usePathname()
  const [displayName, setDisplayName] = useState("Docteur")
  const pageTitle = pathname.replace("/", "") || "dashboard"

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("utilisateurs")
        .select("nom, prenom")
        .eq("id", user.id)
        .maybeSingle<Profil>()

      if (data?.nom || data?.prenom) {
        setDisplayName(`${data.prenom ?? ""} ${data.nom ?? ""}`.trim())
      } else if (user.email) {
        setDisplayName(user.email)
      }
    })()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <header
      className="sticky top-0 z-30 mb-6 flex items-center justify-between rounded-2xl border px-5 py-4 shadow-sm backdrop-blur"
      style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <Logo size={36} showText={false} />
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {CABINET.nom}
          </p>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {displayName}
          </h2>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {CABINET.email} - {pageTitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700 dark:bg-sky-900 dark:text-sky-100">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
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
    </header>
  )
}
