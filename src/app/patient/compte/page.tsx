"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { usePatientRealtime } from "../_components/PatientRealtimeContext"

function formatNaissance(value: string | null) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return value
  }
}

export default function PatientComptePage() {
  const router = useRouter()
  const { loading, error, patient } = usePatientRealtime()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.replace("/patient/login")
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[var(--patient-surface2)]" />
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!patient) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Aucune fiche patient liée à ce compte.
      </p>
    )
  }

  const initials = `${patient.prenom?.[0] ?? ""}${patient.nom?.[0] ?? ""}`.toUpperCase()

  return (
    <div className="space-y-5">
      <div className="patient-surface rounded-2xl border p-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white">
          {initials}
        </div>
        <h2 className="mt-3 text-center text-xl font-bold text-[var(--patient-text)]">
          {patient.prenom} {patient.nom}
        </h2>
        <p className="text-center text-sm text-[var(--patient-text2)]">{patient.telephone}</p>
      </div>

      <section className="patient-surface space-y-3 rounded-2xl border p-4 shadow-sm">
        <InfoRow label="Email" value={patient.email ?? "—"} />
        <InfoRow label="Date de naissance" value={formatNaissance(patient.date_naissance)} />
        <InfoRow label="Groupe sanguin" value={patient.groupe_sanguin ?? "—"} />
        <InfoRow label="Allergies" value={patient.allergies ?? "—"} />
        <InfoRow label="Ville" value={patient.ville ?? "—"} />
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex h-12 min-h-[48px] w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-70 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
      >
        {signingOut ? "Déconnexion..." : "Se déconnecter"}
      </button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--patient-text2)]">{label}</p>
      <p className="mt-0.5 text-sm text-[var(--patient-text)]">{value}</p>
    </div>
  )
}
