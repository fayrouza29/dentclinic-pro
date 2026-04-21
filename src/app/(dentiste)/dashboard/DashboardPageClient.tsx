"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Calendar, MessageCircle, Plus, TrendingUp, Users } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTN, formatMoneyTND } from "@/lib/format"
import { logPatientInsertError } from "@/lib/patient-insert-payload"
import { supabase } from "@/lib/supabase"
import { genererLienWhatsApp } from "@/lib/whatsapp"

type Stats = {
  totalPatients: number
  rdvAujourdHui: number
  revenusMois: number
  impayes: number
}

type RdvDuJour = {
  id: string
  date_rdv: string
  motif: string | null
  statut: "planifie" | "confirme" | "termine" | "annule" | "absent"
  patient_id: string
  patients: {
    nom: string
    prenom: string
    telephone: string
  }[] | null
}

type PatientRecent = {
  id: string
  nom: string
  prenom: string
  telephone: string
  created_at: string
}

const statusStyle: Record<RdvDuJour["statut"], string> = {
  planifie: "bg-blue-100 text-blue-700",
  confirme: "bg-cyan-100 text-cyan-700",
  termine: "bg-emerald-100 text-emerald-700",
  annule: "bg-red-100 text-red-700",
  absent: "bg-orange-100 text-orange-700",
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    rdvAujourdHui: 0,
    revenusMois: 0,
    impayes: 0,
  })
  const [rdvDuJour, setRdvDuJour] = useState<RdvDuJour[]>([])
  const [patientsRecents, setPatientsRecents] = useState<PatientRecent[]>([])
  const [patientsSelect, setPatientsSelect] = useState<Pick<PatientRecent, "id" | "nom" | "prenom">[]>(
    [],
  )

  const [openPatientModal, setOpenPatientModal] = useState(false)
  const [openRdvModal, setOpenRdvModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [patientForm, setPatientForm] = useState({
    prenom: "",
    nom: "",
    telephone: "",
  })
  const [rdvForm, setRdvForm] = useState({
    patient_id: "",
    date_rdv: "",
    motif: "",
  })

  const dateFr = useMemo(
    () =>
      new Date().toLocaleDateString("fr-TN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  )

  async function chargerDashboard() {
    setLoading(true)
    setErrorMessage(null)
    try {
      const now = new Date()
      const debutJour = new Date(now)
      debutJour.setHours(0, 0, 0, 0)
      const finJour = new Date(now)
      finJour.setHours(23, 59, 59, 999)
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)

      const [patientsCountQ, rdvCountQ, revenusQ, impayesQ, rdvQ, recentsQ, patientsQ] =
        await Promise.all([
          supabase.from("patients").select("*", { count: "exact", head: true }),
          supabase
            .from("rendez_vous")
            .select("*", { count: "exact", head: true })
            .gte("date_rdv", debutJour.toISOString())
            .lte("date_rdv", finJour.toISOString()),
          supabase
            .from("actes")
            .select("montant_paye, date_acte")
            .gte("date_acte", debutMois.toISOString().slice(0, 10)),
          supabase
            .from("actes")
            .select("montant_total, montant_paye")
            .neq("statut_paiement", "paye"),
          supabase
            .from("rendez_vous")
            .select("id, date_rdv, motif, statut, patient_id, patients(nom, prenom, telephone)")
            .gte("date_rdv", debutJour.toISOString())
            .lte("date_rdv", finJour.toISOString())
            .order("date_rdv", { ascending: true }),
          supabase
            .from("patients")
            .select("id, nom, prenom, telephone, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase.from("patients").select("id, nom, prenom").order("nom", { ascending: true }),
        ])

      const firstError =
        patientsCountQ.error ||
        rdvCountQ.error ||
        revenusQ.error ||
        impayesQ.error ||
        rdvQ.error ||
        recentsQ.error ||
        patientsQ.error

      if (firstError) {
        setErrorMessage(firstError.message)
        return
      }

      const revenusMois = (revenusQ.data ?? []).reduce(
        (sum, row) => sum + (Number(row.montant_paye) || 0),
        0,
      )
      const impayes = (impayesQ.data ?? []).reduce((sum, row) => {
        const total = Number(row.montant_total) || 0
        const paye = Number(row.montant_paye) || 0
        return sum + Math.max(0, total - paye)
      }, 0)

      setStats({
        totalPatients: patientsCountQ.count ?? 0,
        rdvAujourdHui: rdvCountQ.count ?? 0,
        revenusMois,
        impayes,
      })
      setRdvDuJour((rdvQ.data as RdvDuJour[]) ?? [])
      setPatientsRecents((recentsQ.data as PatientRecent[]) ?? [])
      setPatientsSelect((patientsQ.data as Pick<PatientRecent, "id" | "nom" | "prenom">[]) ?? [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.")
    } finally {
      setLoading(false)
    }
  }

  async function ajouterPatient() {
    if (!patientForm.prenom.trim() || !patientForm.nom.trim() || !patientForm.telephone.trim()) {
      toast.error("Prénom, nom et téléphone sont obligatoires.")
      return
    }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from("patients")
        .insert({
          nom: patientForm.nom.trim(),
          prenom: patientForm.prenom.trim(),
          telephone: patientForm.telephone.trim(),
        })
        .select("id")
        .maybeSingle()

      if (error) {
        logPatientInsertError(error)
        toast.error(error.message || "Erreur ajout patient")
        return
      }

      console.log("Patient créé (dashboard):", data)
      toast.success("Patient ajouté avec succès !")
      setOpenPatientModal(false)
      setPatientForm({ prenom: "", nom: "", telephone: "" })
      await chargerDashboard()
    } catch (error) {
      console.error("[ajouterPatient dashboard]", error)
      toast.error(error instanceof Error ? error.message : "Impossible d'ajouter le patient.")
    } finally {
      setSaving(false)
    }
  }

  async function ajouterRdv() {
    if (!rdvForm.patient_id || !rdvForm.date_rdv || !rdvForm.motif.trim()) {
      toast.error("Tous les champs du rendez-vous sont obligatoires.")
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from("rendez_vous").insert({
        patient_id: rdvForm.patient_id,
        date_rdv: new Date(rdvForm.date_rdv).toISOString(),
        motif: rdvForm.motif.trim(),
        statut: "planifie",
      })
      if (error) throw error
      toast.success("Rendez-vous ajouté.")
      setOpenRdvModal(false)
      setRdvForm({ patient_id: "", date_rdv: "", motif: "" })
      await chargerDashboard()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'ajouter le rendez-vous.")
    } finally {
      setSaving(false)
    }
  }

  async function terminerRdv(id: string) {
    try {
      const { error } = await supabase.from("rendez_vous").update({ statut: "termine" }).eq("id", id)
      if (error) throw error
      toast.success("Rendez-vous marqué comme terminé.")
      await chargerDashboard()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible.")
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void chargerDashboard()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/90">{dateFr}</p>
            <h1 className="text-3xl font-bold">Bonjour Docteur !</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={openPatientModal} onOpenChange={setOpenPatientModal}>
              <DialogTrigger className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50">
                <Plus className="h-4 w-4" />
                Nouveau Patient
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un patient</DialogTitle>
                  <DialogDescription>Renseignez les informations principales.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Prénom *</Label>
                    <Input
                      value={patientForm.prenom}
                      onChange={(e) => setPatientForm((s) => ({ ...s, prenom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Nom *</Label>
                    <Input
                      value={patientForm.nom}
                      onChange={(e) => setPatientForm((s) => ({ ...s, nom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Téléphone *</Label>
                    <Input
                      value={patientForm.telephone}
                      onChange={(e) =>
                        setPatientForm((s) => ({ ...s, telephone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenPatientModal(false)}>
                      Annuler
                    </Button>
                    <Button onClick={ajouterPatient} disabled={saving}>
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openRdvModal} onOpenChange={setOpenRdvModal}>
              <DialogTrigger className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                <Plus className="h-4 w-4" />
                Nouveau RDV
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau rendez-vous</DialogTitle>
                  <DialogDescription>Planifiez un rendez-vous rapidement.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Patient *</Label>
                    <select
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      value={rdvForm.patient_id}
                      onChange={(e) => setRdvForm((s) => ({ ...s, patient_id: e.target.value }))}
                    >
                      <option value="">Sélectionner</option>
                      {patientsSelect.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.prenom} {patient.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Date et heure *</Label>
                    <Input
                      type="datetime-local"
                      value={rdvForm.date_rdv}
                      onChange={(e) => setRdvForm((s) => ({ ...s, date_rdv: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Motif *</Label>
                    <Input
                      value={rdvForm.motif}
                      onChange={(e) => setRdvForm((s) => ({ ...s, motif: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenRdvModal(false)}>
                      Annuler
                    </Button>
                    <Button onClick={ajouterRdv} disabled={saving}>
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            <p className="font-semibold">Erreur Supabase</p>
            <p>{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="rounded-2xl border-0 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <Users className="h-5 w-5 text-[#0EA5E9]" />
                  <p className="font-semibold">Total Patients</p>
                </div>
                <p className="text-3xl font-bold">{stats.totalPatients}</p>
                <p className="text-sm text-slate-500">patients enregistrés</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <Calendar className="h-5 w-5 text-violet-500" />
                  <p className="font-semibold">RDV Aujourd&apos;hui</p>
                </div>
                <p className="text-3xl font-bold">{stats.rdvAujourdHui}</p>
                <p className="text-sm text-slate-500">rendez-vous aujourd&apos;hui</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <p className="font-semibold">Revenus ce mois</p>
                </div>
                <p className="text-3xl font-bold">{formatMoneyTND(stats.revenusMois)}</p>
                <p className="text-sm text-slate-500">TND encaissés ce mois</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <p className="font-semibold">Impayés total</p>
                </div>
                <p className="text-3xl font-bold">{formatMoneyTND(stats.impayes)}</p>
                <p className="text-sm text-slate-500">TND non encaissés</p>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Rendez-vous d&apos;aujourd&apos;hui</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)
            ) : rdvDuJour.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <p className="text-slate-500">Aucun rendez-vous aujourd&apos;hui</p>
              </div>
            ) : (
              rdvDuJour.map((rdv) => {
                const patient = rdv.patients?.[0]
                const whatsappLink = patient
                  ? genererLienWhatsApp(patient.nom, patient.prenom, patient.telephone, rdv.date_rdv)
                  : "#"
                return (
                  <div
                    key={rdv.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50/40"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold text-slate-900">
                        {new Date(rdv.date_rdv).toLocaleTimeString("fr-TN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        - {patient ? `${patient.prenom} ${patient.nom}` : "Patient inconnu"}
                      </p>
                      <Badge className={statusStyle[rdv.statut]}>{rdv.statut}</Badge>
                    </div>
                    <p className="mb-3 text-sm text-slate-600">{rdv.motif || "Sans motif"}</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-200"
                        onClick={() => terminerRdv(rdv.id)}
                      >
                        Terminer
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Derniers patients</CardTitle>
            <Link className="text-sm font-medium text-sky-600 hover:text-sky-700" href="/patients">
              Voir tous les patients
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)
            ) : (
              patientsRecents.map((patient) => {
                const initials = `${patient.prenom[0] ?? ""}${patient.nom[0] ?? ""}`.toUpperCase()
                return (
                  <div
                    key={patient.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 font-semibold text-sky-700">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {patient.prenom} {patient.nom}
                      </p>
                      <p className="text-xs text-slate-500">{patient.telephone}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatDateTN(patient.created_at)}</p>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
