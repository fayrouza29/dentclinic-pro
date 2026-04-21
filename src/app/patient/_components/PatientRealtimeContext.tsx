"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useRealtimePatient, type UseRealtimePatientResult } from "@/hooks/useRealtimePatient"

const PatientRealtimeContext = createContext<UseRealtimePatientResult | null>(null)

export function PatientRealtimeProvider({ children }: { children: ReactNode }) {
  const value = useRealtimePatient()
  return <PatientRealtimeContext.Provider value={value}>{children}</PatientRealtimeContext.Provider>
}

/** Données + temps réel espace patient (un seul abonnement par session). */
export function usePatientRealtime(): UseRealtimePatientResult {
  const ctx = useContext(PatientRealtimeContext)
  if (!ctx) {
    throw new Error("usePatientRealtime doit être utilisé dans PatientRealtimeProvider")
  }
  return ctx
}
