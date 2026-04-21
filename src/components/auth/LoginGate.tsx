"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

/**
 * Si l'utilisateur est déjà connecté, redirige vers le dashboard.
 */
export function LoginGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!cancelled && user) {
          router.replace("/dashboard")
          router.refresh()
          return
        }
      } catch {
        // laisser afficher le formulaire
      }
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Chargement…
      </div>
    )
  }

  return <>{children}</>
}
