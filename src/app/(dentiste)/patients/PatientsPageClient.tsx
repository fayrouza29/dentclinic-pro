"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Trash2, User } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/errors"
import { formatMoneyTND } from "@/lib/format"
import {
  buildPatientInsertPayload,
  isValidOptionalEmail,
  logPatientInsertError,
} from "@/lib/patient-insert-payload"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

// INSERT / SELECT patients : toujours via `supabase` exporté par @/lib/supabase (pas de createClient local).

type PatientRow = {
  id: string
  nom: string
  prenom: string
  telephone: string
  date_naissance: string | null
  created_at: string
}

const bloodOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"

const textareaClass =
  "min-h-[88px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"

const selectClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"

type FieldErrors = {
  prenom?: string
  nom?: string
  telephone?: string
  email?: string
}

function calculerAge(dateNaissance: string | null) {
  if (!dateNaissance) return "-"
  const now = new Date()
  const birth = new Date(dateNaissance)
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return `${age} ans`
}

function colorAvatar(seed: string) {
  const colors = [
    "bg-sky-100 text-sky-700",
    "bg-indigo-100 text-indigo-700",
    "bg-cyan-100 text-cyan-700",
    "bg-emerald-100 text-emerald-700",
  ]
  const index = seed.charCodeAt(0) % colors.length
  return colors[index]
}

const emptyForm = {
  prenom: "",
  nom: "",
  date_naissance: "",
  telephone: "",
  telephone_whatsapp: "",
  email: "",
  adresse: "",
  ville: "",
  sexe: "",
  groupe_sanguin: "",
  allergies: "",
  antecedents_medicaux: "",
  antecedents_dentaires: "",
  notes_generales: "",
}

export default function PatientsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [openModal, setOpenModal] = useState(false)
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [impayesByPatient, setImpayesByPatient] = useState<Record<string, number>>({})

  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [insertError, setInsertError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const patientsFiltres = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) =>
      `${p.prenom} ${p.nom} ${p.telephone}`.toLowerCase().includes(q),
    )
  }, [patients, search])

  async function chargerPatients() {
    setLoading(true)
    try {
      const [patientsQ, actesQ] = await Promise.all([
        supabase
          .from("patients")
          .select("id, nom, prenom, telephone, date_naissance, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("actes").select("patient_id, montant_total, montant_paye"),
      ])

      if (patientsQ.error) throw patientsQ.error
      if (actesQ.error) throw actesQ.error

      const map: Record<string, number> = {}
      ;(actesQ.data ?? []).forEach((acte) => {
        const restant = Math.max(
          0,
          (Number(acte.montant_total) || 0) - (Number(acte.montant_paye) || 0),
        )
        map[acte.patient_id] = (map[acte.patient_id] ?? 0) + restant
      })

      setPatients((patientsQ.data as PatientRow[]) ?? [])
      setImpayesByPatient(map)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur chargement patients.")
    } finally {
      setLoading(false)
    }
  }

  async function supprimerPatient(p: PatientRow) {
    const ok = window.confirm(
      `Supprimer définitivement ${p.prenom} ${p.nom} ? Toutes les données liées (RDV, actes, paiements) seront supprimées.`,
    )
    if (!ok) return
    setSaving(true)
    try {
      const { error } = await supabase.from("patients").delete().eq("id", p.id)
      if (error) throw error
      toast.success("Patient supprimé.")
      await chargerPatients()
    } catch (error) {
      console.error("[supprimerPatient]", error)
      toast.error(getErrorMessage(error, "Suppression impossible."))
    } finally {
      setSaving(false)
    }
  }

  function runFieldValidation(): boolean {
    const next: FieldErrors = {}
    if (!form.prenom.trim()) next.prenom = "Le prénom est requis."
    if (!form.nom.trim()) next.nom = "Le nom est requis."
    if (!form.telephone.trim()) next.telephone = "Le téléphone est requis."
    if (form.email.trim() && !isValidOptionalEmail(form.email)) {
      next.email = "Format d’email invalide."
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function ajouterPatient() {
    setSubmitted(true)
    setInsertError(null)
    if (!runFieldValidation()) {
      return
    }

    setSaving(true)
    try {
      const payload = buildPatientInsertPayload(form)

      const { data, error } = await supabase.from("patients").insert(payload).select("id").maybeSingle()

      if (error) {
        console.error("Erreur:", error)
        logPatientInsertError(error)
        const detail =
          [error.message, error.details, error.hint].filter(Boolean).join(" — ") || error.message
        setInsertError(detail)
        toast.error("Erreur: " + error.message)
        return
      }

      console.log("Patient créé:", data)

      toast.success("Patient ajouté avec succès !")
      setOpenModal(false)
      setSubmitted(false)
      setFieldErrors({})
      setInsertError(null)
      setForm({ ...emptyForm })
      await chargerPatients()
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Impossible d'ajouter le patient."
      console.error("[ajouterPatient]", error)
      setInsertError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void chargerPatients()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Rechercher par nom, prénom ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Dialog
          open={openModal}
          onOpenChange={(open) => {
            setOpenModal(open)
            if (!open) {
              setInsertError(null)
              setSubmitted(false)
              setFieldErrors({})
            }
          }}
        >
          <DialogTrigger className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
            <Plus className="h-4 w-4" />
            Ajouter un patient
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
            <DialogHeader className="border-b border-gray-100 px-6 py-4 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold text-gray-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <User className="h-5 w-5 text-blue-600" aria-hidden />
                </span>
                Nouveau patient
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 px-6 py-5">
              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                  Informations personnelles
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-prenom">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="np-prenom"
                      className={cn(inputClass, submitted && fieldErrors.prenom && "border-red-400")}
                      placeholder="Prénom"
                      value={form.prenom}
                      onChange={(e) => {
                        setForm((s) => ({ ...s, prenom: e.target.value }))
                        if (fieldErrors.prenom) setFieldErrors((fe) => ({ ...fe, prenom: undefined }))
                      }}
                    />
                    {submitted && fieldErrors.prenom ? (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.prenom}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-nom">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="np-nom"
                      className={cn(inputClass, submitted && fieldErrors.nom && "border-red-400")}
                      placeholder="Nom"
                      value={form.nom}
                      onChange={(e) => {
                        setForm((s) => ({ ...s, nom: e.target.value }))
                        if (fieldErrors.nom) setFieldErrors((fe) => ({ ...fe, nom: undefined }))
                      }}
                    />
                    {submitted && fieldErrors.nom ? (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.nom}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-dob">
                      Date de naissance
                    </label>
                    <input
                      id="np-dob"
                      type="date"
                      className={inputClass}
                      value={form.date_naissance}
                      onChange={(e) => setForm((s) => ({ ...s, date_naissance: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-sexe">
                      Sexe
                    </label>
                    <select
                      id="np-sexe"
                      className={selectClass}
                      value={form.sexe}
                      onChange={(e) => setForm((s) => ({ ...s, sexe: e.target.value }))}
                    >
                      <option value="">Sélectionner</option>
                      <option value="Homme">Homme</option>
                      <option value="Femme">Femme</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-blood">
                      Groupe sanguin
                    </label>
                    <select
                      id="np-blood"
                      className={selectClass}
                      value={form.groupe_sanguin}
                      onChange={(e) => setForm((s) => ({ ...s, groupe_sanguin: e.target.value }))}
                    >
                      <option value="">Sélectionner</option>
                      {bloodOptions.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <hr className="border-gray-200" />

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Contact</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-tel">
                      Téléphone <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="np-tel"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className={cn(inputClass, submitted && fieldErrors.telephone && "border-red-400")}
                      placeholder="Ex: 20 123 456"
                      value={form.telephone}
                      onChange={(e) => {
                        setForm((s) => ({ ...s, telephone: e.target.value }))
                        if (fieldErrors.telephone) setFieldErrors((fe) => ({ ...fe, telephone: undefined }))
                      }}
                    />
                    {submitted && fieldErrors.telephone ? (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.telephone}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-wa">
                      Téléphone WhatsApp
                    </label>
                    <input
                      id="np-wa"
                      type="tel"
                      inputMode="tel"
                      className={inputClass}
                      placeholder="Optionnel"
                      value={form.telephone_whatsapp}
                      onChange={(e) => setForm((s) => ({ ...s, telephone_whatsapp: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-email">
                      Email
                    </label>
                    <input
                      id="np-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className={cn(inputClass, submitted && fieldErrors.email && "border-red-400")}
                      placeholder="patient@exemple.com"
                      value={form.email}
                      onChange={(e) => {
                        setForm((s) => ({ ...s, email: e.target.value }))
                        if (fieldErrors.email) setFieldErrors((fe) => ({ ...fe, email: undefined }))
                      }}
                    />
                    {submitted && fieldErrors.email ? (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                    ) : null}
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-adr">
                      Adresse
                    </label>
                    <input
                      id="np-adr"
                      className={inputClass}
                      placeholder="Rue, numéro…"
                      value={form.adresse}
                      onChange={(e) => setForm((s) => ({ ...s, adresse: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-ville">
                      Ville
                    </label>
                    <input
                      id="np-ville"
                      className={inputClass}
                      placeholder="Ville"
                      value={form.ville}
                      onChange={(e) => setForm((s) => ({ ...s, ville: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <hr className="border-gray-200" />

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                  Informations médicales
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-all">
                      Allergies
                    </label>
                    <textarea
                      id="np-all"
                      className={textareaClass}
                      placeholder="Ex: Pénicilline, Latex…"
                      value={form.allergies}
                      onChange={(e) => setForm((s) => ({ ...s, allergies: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-am">
                      Antécédents médicaux
                    </label>
                    <textarea
                      id="np-am"
                      className={textareaClass}
                      placeholder="Antécédents médicaux importants"
                      value={form.antecedents_medicaux}
                      onChange={(e) => setForm((s) => ({ ...s, antecedents_medicaux: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-ad">
                      Antécédents dentaires
                    </label>
                    <textarea
                      id="np-ad"
                      className={textareaClass}
                      placeholder="Antécédents dentaires"
                      value={form.antecedents_dentaires}
                      onChange={(e) => setForm((s) => ({ ...s, antecedents_dentaires: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-600" htmlFor="np-notes">
                      Notes générales
                    </label>
                    <textarea
                      id="np-notes"
                      className={textareaClass}
                      placeholder="Notes internes"
                      value={form.notes_generales}
                      onChange={(e) => setForm((s) => ({ ...s, notes_generales: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              {insertError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {insertError}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setOpenModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => void ajouterPatient()}
                disabled={saving}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="rounded-2xl border-0 bg-white shadow-sm">
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          : patientsFiltres.map((patient) => {
              const initials = `${patient.prenom[0] ?? ""}${patient.nom[0] ?? ""}`.toUpperCase()
              const restant = impayesByPatient[patient.id] ?? 0
              return (
                <Card
                  key={patient.id}
                  className="rounded-2xl border-0 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardContent className="flex gap-3 p-5">
                    <Link href={`/patients/${patient.id}`} className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-semibold ${colorAvatar(
                            patient.id,
                          )}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {patient.prenom} {patient.nom}
                          </p>
                          <p className="text-sm text-slate-500">{calculerAge(patient.date_naissance)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">{patient.telephone}</p>
                      {restant > 0 ? (
                        <Badge className="bg-red-100 text-red-700">{formatMoneyTND(restant)} restant</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700">A jour</Badge>
                      )}
                    </Link>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Supprimer le patient"
                      disabled={saving}
                      onClick={(e) => {
                        e.preventDefault()
                        void supprimerPatient(patient)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              )
            })}
      </div>
    </div>
  )
}
