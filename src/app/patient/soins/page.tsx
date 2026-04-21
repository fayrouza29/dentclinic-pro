"use client"

import { useState } from "react"
import { AlertCircle, Banknote, CheckCircle, CreditCard, FileText, Landmark, X } from "lucide-react"
import { formatDateFrLong, formatDateTN, formatMoneyTND } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { usePatientRealtime } from "../_components/PatientRealtimeContext"
import type { PatientActe, PatientPaiement } from "@/hooks/useRealtimePatient"

function badgePaiement(s: string) {
  if (s === "paye") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
  if (s === "partiel") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
}

function ModePaiementIcon({ mode }: { mode: string | null | undefined }) {
  const m = mode ?? ""
  if (m === "especes") return <Banknote className="h-4 w-4 text-[var(--patient-text2)]" />
  if (m === "cheque") return <FileText className="h-4 w-4 text-[var(--patient-text2)]" />
  if (m === "virement") return <Landmark className="h-4 w-4 text-[var(--patient-text2)]" />
  return <CreditCard className="h-4 w-4 text-[var(--patient-text2)]" />
}

function labelModePaiement(mode: string | null | undefined) {
  const map: Record<string, string> = {
    especes: "Espèces",
    cheque: "Chèque",
    carte: "Carte",
    carte_bancaire: "Carte",
    virement: "Virement",
  }
  return map[mode ?? ""] ?? "Carte"
}

export default function PatientSoinsPage() {
  const { loading, error, patient, actes, totals } = usePatientRealtime()
  const [selectedActe, setSelectedActe] = useState<PatientActe | null>(null)
  const [paiementsActe, setPaiementsActe] = useState<PatientPaiement[]>([])
  const [loadingPaiements, setLoadingPaiements] = useState(false)

  async function ouvrirDetailActe(acte: PatientActe) {
    setSelectedActe(acte)
    setLoadingPaiements(true)
    const { data } = await supabase
      .from("paiements")
      .select("*")
      .eq("acte_id", acte.id)
      .order("date_paiement", { ascending: true })
    setPaiementsActe((data as PatientPaiement[]) ?? [])
    setLoadingPaiements(false)
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

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] p-4 text-white shadow-md">
        <p className="text-sm font-medium text-white/90">Résumé</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-xs text-white/80">Total soins</p>
            <p className="font-semibold">{formatMoneyTND(totals.total)}</p>
          </div>
          <div>
            <p className="text-xs text-white/80">Payé</p>
            <p className="font-semibold">{formatMoneyTND(totals.paye)}</p>
          </div>
          <div>
            <p className="text-xs text-white/80">Reste</p>
            <p className="font-semibold">{formatMoneyTND(totals.restant)}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${totals.progress}%` }}
          />
        </div>
      </section>

      <div className="space-y-3">
        {actes.length === 0 ? (
          <p className="text-center text-sm text-[var(--patient-text2)]">Aucun soin enregistré.</p>
        ) : (
          actes.map((acte) => {
            const reste = Math.max(0, Number(acte.montant_total) - Number(acte.montant_paye))
            return (
              <div
                key={acte.id}
                onClick={() => void ouvrirDetailActe(acte)}
                className="cursor-pointer rounded-2xl border border-[var(--patient-border)] bg-[var(--patient-surface)] p-4 shadow-sm transition hover:shadow-md active:scale-95"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-[var(--patient-text3)]">{formatDateTN(acte.date_acte)}</p>
                    <p className="text-base font-semibold text-[var(--patient-text)]">{acte.type_acte}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgePaiement(acte.statut_paiement)}`}
                  >
                    {acte.statut_paiement === "paye"
                      ? "Payé"
                      : acte.statut_paiement === "partiel"
                        ? "Partiel"
                        : "Non payé"}
                  </span>
                </div>
                {acte.description ? (
                  <p className="mt-2 text-sm text-[var(--patient-text2)]">{acte.description}</p>
                ) : null}
                {acte.dent_numero ? (
                  <span className="mt-2 inline-flex rounded-md bg-[var(--patient-surface2)] px-2 py-0.5 text-xs text-[var(--patient-text2)]">
                    Dent {acte.dent_numero}
                  </span>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--patient-text2)]">
                  <span>Total : {formatMoneyTND(Number(acte.montant_total))}</span>
                  <span>Payé : {formatMoneyTND(Number(acte.montant_paye))}</span>
                  <span className={reste > 0 ? "font-medium text-red-600" : "text-emerald-600"}>
                    Reste : {formatMoneyTND(reste)}
                  </span>
                </div>
                <span className="mt-2 block text-xs text-blue-500">Voir détail -&gt;</span>
              </div>
            )
          })
        )}
      </div>

      {actes.length > 0 ? (
        <section className="rounded-2xl border border-[var(--patient-border)] bg-[var(--patient-surface)] p-4 shadow-sm">
          <p className="text-sm font-semibold text-[var(--patient-text)]">Total général</p>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-[var(--patient-text2)]">Total : {formatMoneyTND(totals.total)}</span>
            <span className="text-emerald-600">Payé : {formatMoneyTND(totals.paye)}</span>
            <span className={totals.restant > 0 ? "font-semibold text-red-600" : "text-emerald-600"}>
              Reste : {formatMoneyTND(totals.restant)}
            </span>
          </div>
        </section>
      ) : null}

      {selectedActe ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setSelectedActe(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-[var(--patient-surface)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[var(--patient-text)]">{selectedActe.type_acte}</p>
                <p className="text-sm text-[var(--patient-text2)]">{formatDateFrLong(selectedActe.date_acte)}</p>
                {selectedActe.dent_numero ? (
                  <span className="mt-2 inline-flex rounded-full bg-[var(--patient-surface2)] px-2 py-1 text-xs font-medium text-[var(--patient-text2)]">
                    Dent {selectedActe.dent_numero}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedActe(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--patient-surface2)] text-[var(--patient-text2)]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-xl bg-[var(--patient-surface2)] p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-6 w-6 text-[var(--patient-text2)]" />
                  <div>
                    <p className="text-sm text-[var(--patient-text2)]">Total de l'acte</p>
                    <p className="text-lg font-semibold text-[var(--patient-text)]">
                      {formatMoneyTND(Number(selectedActe.montant_total))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="text-sm text-[var(--patient-text2)]">Montant payé</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {formatMoneyTND(Number(selectedActe.montant_paye))}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-xl p-4 ${
                  Number(selectedActe.montant_total) - Number(selectedActe.montant_paye) > 0
                    ? "bg-red-50"
                    : "bg-emerald-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {Number(selectedActe.montant_total) - Number(selectedActe.montant_paye) > 0 ? (
                    <AlertCircle className="mt-0.5 h-6 w-6 text-red-600" />
                  ) : (
                    <CheckCircle className="mt-0.5 h-6 w-6 text-emerald-600" />
                  )}
                  <div>
                    <p className="text-sm text-[var(--patient-text2)]">Reste à payer</p>
                    <p
                      className={`text-lg font-semibold ${
                        Number(selectedActe.montant_total) - Number(selectedActe.montant_paye) > 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {Number(selectedActe.montant_total) - Number(selectedActe.montant_paye) > 0
                        ? formatMoneyTND(
                            Math.max(0, Number(selectedActe.montant_total) - Number(selectedActe.montant_paye)),
                          )
                        : "Soldé ✓"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--patient-text2)]">Progression du paiement</p>
                <p className="text-sm font-semibold text-[var(--patient-text)]">
                  {Number(selectedActe.montant_total) > 0
                    ? Math.round((Number(selectedActe.montant_paye) / Number(selectedActe.montant_total)) * 100)
                    : 0}
                  %
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--patient-surface2)]">
                <div
                  className={`h-full rounded-full ${
                    Number(selectedActe.montant_total) > 0 &&
                    Math.round((Number(selectedActe.montant_paye) / Number(selectedActe.montant_total)) * 100) ===
                      100
                      ? "bg-green-500"
                      : Number(selectedActe.montant_total) > 0 &&
                          Math.round(
                            (Number(selectedActe.montant_paye) / Number(selectedActe.montant_total)) * 100,
                          ) >=
                            50
                        ? "bg-orange-400"
                        : Number(selectedActe.montant_total) > 0 &&
                            Math.round(
                              (Number(selectedActe.montant_paye) / Number(selectedActe.montant_total)) * 100,
                            ) >
                              0
                          ? "bg-red-400"
                          : "bg-gray-200"
                  }`}
                  style={{
                    width: `${
                      Number(selectedActe.montant_total) > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              Math.round(
                                (Number(selectedActe.montant_paye) / Number(selectedActe.montant_total)) * 100,
                              ),
                            ),
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-4">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgePaiement(selectedActe.statut_paiement)}`}>
                {selectedActe.statut_paiement === "paye"
                  ? "Payé"
                  : selectedActe.statut_paiement === "partiel"
                    ? "Paiement partiel"
                    : "Non payé"}
              </span>
            </div>

            {selectedActe.description ? (
              <div className="mt-5 rounded-xl bg-[var(--patient-surface2)] p-4">
                <p className="text-sm font-semibold text-[var(--patient-text)]">Description</p>
                <p className="mt-1 text-sm text-[var(--patient-text2)]">{selectedActe.description}</p>
              </div>
            ) : null}
            {(selectedActe as PatientActe & { notes?: string | null }).notes ? (
              <div className="mt-3 rounded-xl bg-[var(--patient-surface2)] p-4">
                <p className="text-sm font-semibold text-[var(--patient-text)]">Notes</p>
                <p className="mt-1 text-sm text-[var(--patient-text2)]">
                  {(selectedActe as PatientActe & { notes?: string | null }).notes}
                </p>
              </div>
            ) : null}

            <div className="mt-5 rounded-xl bg-[var(--patient-surface2)] p-4">
              <p className="text-sm font-semibold text-[var(--patient-text)]">Historique des paiements</p>
              {loadingPaiements ? (
                <p className="mt-2 text-sm text-[var(--patient-text2)]">Chargement...</p>
              ) : paiementsActe.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--patient-text2)]">Aucun paiement enregistré</p>
              ) : (
                <div className="mt-2 divide-y divide-[var(--patient-border)]">
                  {paiementsActe.map((paiement) => (
                    <div key={paiement.id} className="flex items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm text-[var(--patient-text)]">
                          {new Date(paiement.date_paiement).toLocaleDateString("fr-FR")}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--patient-text2)]">
                          <ModePaiementIcon mode={paiement.mode_paiement} />
                          <span>{labelModePaiement(paiement.mode_paiement)}</span>
                        </div>
                        {paiement.notes ? <p className="mt-1 text-xs text-[var(--patient-text2)]">{paiement.notes}</p> : null}
                      </div>
                      <p className="text-sm font-semibold text-emerald-600">
                        + {formatMoneyTND(Number(paiement.montant))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
