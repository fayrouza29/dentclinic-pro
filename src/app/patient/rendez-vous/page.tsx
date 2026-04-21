"use client"

import { useMemo, useState } from "react"
import { formatDateFrLong } from "@/lib/format"
import { usePatientRealtime } from "../_components/PatientRealtimeContext"

function borderByStatut(statut: string) {
  if (statut === "planifie") return "border-l-4 border-blue-500"
  if (statut === "confirme") return "border-l-4 border-cyan-500"
  if (statut === "termine") return "border-l-4 border-green-500"
  if (statut === "annule") return "border-l-4 border-red-500"
  if (statut === "absent") return "border-l-4 border-orange-500"
  return "border-l-4 border-slate-300"
}

function badgeStatut(statut: string) {
  if (statut === "planifie") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
  if (statut === "confirme") return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
  if (statut === "termine") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
  if (statut === "annule") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
  if (statut === "absent") return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
  return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
}

function libelleStatutRdv(statut: string) {
  const m: Record<string, string> = {
    planifie: "Planifié",
    confirme: "Confirmé",
    termine: "Terminé",
    annule: "Annulé",
    absent: "Absent",
  }
  return m[statut] ?? statut
}

export default function PatientRendezVousPage() {
  const { loading, error, patient, rdvs } = usePatientRealtime()
  const [tab, setTab] = useState<"avenir" | "passes">("avenir")

  const { aVenir, passes } = useMemo(() => {
    const now = Date.now()
    const futur = rdvs
      .filter((r) => new Date(r.date_rdv).getTime() >= now)
      .sort((a, b) => new Date(a.date_rdv).getTime() - new Date(b.date_rdv).getTime())
    const past = rdvs
      .filter((r) => new Date(r.date_rdv).getTime() < now)
      .sort((a, b) => new Date(b.date_rdv).getTime() - new Date(a.date_rdv).getTime())
    return { aVenir: futur, passes: past }
  }, [rdvs])

  const list = tab === "avenir" ? aVenir : passes

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

  return (
    <div className="space-y-4">
      <div className="inline-flex min-h-[44px] rounded-full bg-[var(--patient-surface2)] p-1">
        <button
          type="button"
          className={`min-h-[44px] min-w-[120px] rounded-full px-4 text-sm font-medium ${
            tab === "avenir" ? "bg-[var(--patient-surface)] text-blue-500 shadow-sm" : "text-[var(--patient-text2)]"
          }`}
          onClick={() => setTab("avenir")}
        >
          À venir
        </button>
        <button
          type="button"
          className={`min-h-[44px] min-w-[120px] rounded-full px-4 text-sm font-medium ${
            tab === "passes" ? "bg-[var(--patient-surface)] text-blue-500 shadow-sm" : "text-[var(--patient-text2)]"
          }`}
          onClick={() => setTab("passes")}
        >
          Passés
        </button>
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <p className="text-center text-sm text-[var(--patient-text2)]">Aucun rendez-vous dans cette liste.</p>
        ) : (
          list.map((rdv) => (
            <div
              key={rdv.id}
              className={`rounded-2xl border border-[var(--patient-border)] bg-[var(--patient-surface)] p-4 shadow-sm ${borderByStatut(rdv.statut)} ${tab === "passes" ? "opacity-90" : ""}`}
            >
              <p className="mb-1 text-xs text-[var(--patient-text3)]">{formatDateFrLong(rdv.date_rdv)}</p>
              <p className="mt-1 text-2xl font-bold text-blue-500">
                {new Date(rdv.date_rdv).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--patient-text)]">{rdv.motif || "Sans motif"}</p>
              {rdv.duree_minutes != null ? (
                <p className="mt-1 text-xs text-[var(--patient-text3)]">Durée : {rdv.duree_minutes} minutes</p>
              ) : null}
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeStatut(rdv.statut)}`}
              >
                {libelleStatutRdv(rdv.statut)}
              </span>
              {rdv.notes ? (
                <p className="mt-2 border-t border-[var(--patient-border)] pt-2 text-sm text-[var(--patient-text2)]">{rdv.notes}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
