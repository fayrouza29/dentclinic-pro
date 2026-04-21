"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Calendar, Mail, Phone } from "lucide-react"
import { CABINET } from "@/lib/cabinet"
import { formatDateFrLong, formatDateTN, formatMoneyTND } from "@/lib/format"
import { usePatientRealtime } from "../_components/PatientRealtimeContext"

function avatarColor(seed: string) {
  const colors = ["bg-sky-100 text-sky-700", "bg-indigo-100 text-indigo-700", "bg-cyan-100 text-cyan-700"]
  return colors[Math.abs(seed.charCodeAt(0)) % colors.length]
}

/** Données chargées via `usePatientRealtime` (getUser + fiche patient par auth_user_id puis email). */
export default function PatientDashboardPage() {
  const { loading, error, patient, patientNotFound, rdvs, actes, totals } = usePatientRealtime()

  const dateJour = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [],
  )

  const prochainRdv = useMemo(() => {
    const now = Date.now()
    return rdvs
      .filter((r) => new Date(r.date_rdv).getTime() > now && r.statut !== "annule")
      .sort((a, b) => new Date(a.date_rdv).getTime() - new Date(b.date_rdv).getTime())[0]
  }, [rdvs])

  const derniersActes = useMemo(() => actes.slice(0, 3), [actes])

  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-[var(--patient-surface2)]" />
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!patient) {
    return (
      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p>
          {patientNotFound
            ? "Aucune fiche patient ne correspond à ce compte. Utilisez l’email enregistré par votre cabinet, ou contactez-le pour activer votre accès."
            : "Impossible d’afficher votre espace pour le moment."}
        </p>
        <button
          type="button"
          className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-200"
          onClick={() => window.location.reload()}
        >
          Réessayer
        </button>
      </div>
    )
  }

  const initials = `${patient.prenom?.[0] ?? ""}${patient.nom?.[0] ?? ""}`.toUpperCase()

  return (
    <div className="space-y-5">
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-5 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <svg width="28" height="28" viewBox="0 0 100 100" aria-hidden>
              <path
                d="M20 15 C20 15, 15 10, 25 8 C32 6, 38 12,
          50 12 C62 12, 68 6, 75 8 C85 10, 80 15, 80 15
          C85 25, 82 35, 78 45 C74 55, 72 60, 68 70
          C65 78, 62 88, 58 92 C55 96, 52 96, 50 92
          C48 96, 45 96, 42 92 C38 88, 35 78, 32 70
          C28 60, 26 55, 22 45 C18 35, 15 25, 20 15 Z"
                fill="white"
                opacity="0.9"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg leading-tight font-bold">{CABINET.nomCourt}</h2>
            <p className="text-xs text-blue-100">{CABINET.docteur}</p>
          </div>
        </div>
        <div className="mb-3 h-px bg-white/20" />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">
              <Phone size={12} className="text-white" />
            </div>
            <span className="text-sm font-medium text-white">{CABINET.telephone}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">
              <Mail size={12} className="text-white" />
            </div>
            <span className="text-sm text-white">{CABINET.email}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs italic text-blue-100">"{CABINET.slogan}"</span>
          </div>
        </div>
      </div>

      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold text-[var(--patient-text)]">Bonjour {patient.prenom} !</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className={`flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-sm font-bold ${avatarColor(patient.id)}`}
          >
            {initials}
          </div>
          <p className="max-w-[160px] text-right text-xs capitalize text-[var(--patient-text2)]">{dateJour}</p>
        </div>
      </header>

      <section>
        {prochainRdv ? (
          <div className="patient-card rounded-2xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] p-4 text-white shadow-md">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-8 w-8 shrink-0 text-white" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white/90">Prochain rendez-vous</p>
                <p className="mt-1 text-lg font-bold capitalize leading-tight">
                  {formatDateFrLong(prochainRdv.date_rdv)}
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {new Date(prochainRdv.date_rdv).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 text-sm text-white/95">{prochainRdv.motif || "Sans motif"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="patient-card rounded-2xl border border-[var(--patient-border)] bg-[var(--patient-surface)] p-4 text-center text-sm text-[var(--patient-text2)]">
            Aucun rendez-vous planifié
          </div>
        )}
      </section>

      <section className="patient-card rounded-2xl border border-[var(--patient-border)] bg-[var(--patient-surface)] p-4 shadow-sm">
        <p className="text-sm font-semibold text-[var(--patient-text)]">Résumé financier</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-xs text-[var(--patient-text2)]">Total</p>
            <p className="font-semibold text-[var(--patient-text)]">{formatMoneyTND(totals.total)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--patient-text2)]">Payé</p>
            <p className="font-semibold text-emerald-600">{formatMoneyTND(totals.paye)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--patient-text2)]">Reste</p>
            <p
              className={`font-semibold ${totals.restant > 0 ? "text-red-600" : "text-emerald-600"}`}
            >
              {formatMoneyTND(totals.restant)}
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--patient-surface2)]">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${totals.progress}%` }}
          />
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--patient-text)]">Derniers soins</h2>
          <Link href="/patient/soins" className="min-h-[44px] text-sm font-medium text-blue-500">
            Voir tous mes soins
          </Link>
        </div>
        <div className="space-y-2">
          {derniersActes.length === 0 ? (
            <p className="text-sm text-[var(--patient-text2)]">Aucun soin enregistré.</p>
          ) : (
            derniersActes.map((acte) => (
              <div key={acte.id} className="patient-card rounded-xl border border-[var(--patient-border)] bg-[var(--patient-surface)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--patient-text)]">{acte.type_acte}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      acte.statut_paiement === "paye"
                        ? "bg-emerald-100 text-emerald-800"
                        : acte.statut_paiement === "partiel"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {acte.statut_paiement === "paye"
                      ? "Payé"
                      : acte.statut_paiement === "partiel"
                        ? "Partiel"
                        : "Non payé"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--patient-text3)]">{formatDateTN(acte.date_acte)}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
