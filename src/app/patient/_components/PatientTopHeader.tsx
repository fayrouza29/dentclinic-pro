"use client"

import { usePathname } from "next/navigation"
import { Logo } from "@/components/Logo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { usePatientRealtime } from "./PatientRealtimeContext"

const titleByPath: Record<string, string> = {
  "/patient/dashboard": "Accueil",
  "/patient": "Accueil",
  "/patient/rendez-vous": "Mes rendez-vous",
  "/patient/soins": "Mes soins",
  "/patient/compte": "Mon compte",
  "/patient/login": "Connexion",
}

export function PatientTopHeader() {
  const pathname = usePathname()
  const title = titleByPath[pathname] ?? "Espace patient"
  const { patient } = usePatientRealtime()

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 min-h-[56px] border-b border-[var(--patient-border)] bg-[var(--patient-header-bg)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-full w-full max-w-[430px] items-center justify-center px-4">
        <h1 className="text-base font-semibold text-[var(--patient-text)]">{title}</h1>
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <Logo size={28} showText={false} />
        </div>
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
          <ThemeToggle className="h-9 w-9 rounded-lg bg-[var(--patient-surface2)] text-[var(--patient-text2)] hover:opacity-90" />
          {patient ? (
            <div className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse"
                aria-hidden
              />
              <span className="text-[11px] font-medium text-emerald-500">En direct</span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
