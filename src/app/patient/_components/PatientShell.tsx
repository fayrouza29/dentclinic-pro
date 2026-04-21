"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { PatientBottomNav } from "./PatientBottomNav"
import { PatientRealtimeProvider } from "./PatientRealtimeContext"
import { PatientTopHeader } from "./PatientTopHeader"

export function PatientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  const isLogin = pathname === "/patient/login"

  useEffect(() => {
    let cancelled = false

    if (isLogin) {
      setReady(true)
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (cancelled || !user) return
        router.replace("/patient/dashboard")
      })()
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!cancelled) {
        if (!user) {
          router.replace("/patient/login")
          return
        }
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLogin, router])

  if (!isLogin && !ready) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center bg-[var(--patient-bg)] px-4 text-sm text-[var(--patient-text2)]">
        Chargement...
      </div>
    )
  }

  return (
    <div
      className={`patient-app scroll-smooth mx-auto min-h-screen w-full max-w-[430px] pb-[env(safe-area-inset-bottom)] ${isLogin ? "" : "bg-[var(--patient-bg)] text-[var(--patient-text)] transition-colors duration-300"}`}
    >
      {isLogin ? (
        <main className="min-h-screen w-full">{children}</main>
      ) : (
        <PatientRealtimeProvider>
          <PatientTopHeader />
          <main className="animate-fade-in min-h-screen px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-14">
            {children}
          </main>
          <PatientBottomNav />
        </PatientRealtimeProvider>
      )}
    </div>
  )
}
