"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  MessageCircle,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/errors"
import { formatDateTN, formatMoneyTND } from "@/lib/format"
import { cn } from "@/lib/utils"
import { generateTempPassword } from "@/lib/patient-password"
import { getPatientLoginUrl } from "@/lib/site-url"
import { supabase } from "@/lib/supabase"
import {
  genererLienWhatsApp,
  genererLienWhatsAppAccesPatient,
  messageAccesPatientMobile,
} from "@/lib/whatsapp"
import { RdvBigCalendar, type RdvCalendarRow } from "./RdvBigCalendar"

function ageFromBirth(dateNaissance: string | null) {
  if (!dateNaissance) return null
  const birth = new Date(dateNaissance)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return `${age} ans`
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  const empty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {empty ? (
        <p className="mt-0.5 text-sm font-bold italic text-slate-400">Non renseigné</p>
      ) : (
        <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
      )}
    </div>
  )
}

function badgeStatutActeClasses(statut: string) {
  if (statut === "paye") return "bg-emerald-100 text-emerald-800 border-emerald-200"
  if (statut === "partiel") return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-red-100 text-red-800 border-red-200"
}

function badgeStatutActeLabel(statut: string) {
  if (statut === "paye") return "Payé"
  if (statut === "partiel") return "Partiel"
  return "Non payé"
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function labelModePaiement(m: string | null | undefined) {
  const map: Record<string, string> = {
    especes: "Espèces",
    cheque: "Chèque",
    carte_bancaire: "Carte bancaire",
    carte: "Carte bancaire",
    virement: "Virement",
  }
  return map[m ?? ""] ?? m ?? "—"
}

function ModePaiementIcon({ mode }: { mode: string | null | undefined }) {
  const m = mode ?? ""
  if (m === "especes") return <Banknote className="h-4 w-4 text-slate-500" />
  if (m === "cheque") return <FileText className="h-4 w-4 text-slate-500" />
  if (m === "virement") return <Landmark className="h-4 w-4 text-slate-500" />
  return <CreditCard className="h-4 w-4 text-slate-500" />
}

type Patient = {
  id: string
  nom: string
  prenom: string
  sexe: string | null
  date_naissance: string | null
  telephone: string
  telephone_whatsapp?: string | null
  email: string | null
  adresse?: string | null
  ville: string | null
  groupe_sanguin?: string | null
  allergies: string | null
  antecedents_medicaux: string | null
  antecedents_dentaires: string | null
  notes_generales: string | null
  auth_user_id: string | null
  email_confirmed?: boolean | null
  actif?: boolean | null
  mot_de_passe_temp?: string | null
}

type Acte = {
  id: string
  date_acte: string
  type_acte: string
  dent_numero: string | null
  description?: string | null
  montant_total: number
  montant_paye: number
  statut_paiement: string
}

type Paiement = {
  id: string
  acte_id: string
  patient_id: string
  montant: number
  date_paiement: string
  mode_paiement: string | null
  notes: string | null
}

type PaiementAvecActe = Paiement & {
  actes: { type_acte: string } | null
}

const RDV_STATUTS: { value: string; label: string }[] = [
  { value: "planifie", label: "Planifié" },
  { value: "confirme", label: "Confirmé" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" },
  { value: "absent", label: "Absent" },
]

export default function PatientDetailPageClient() {
  const params = useParams<{ id: string }>()
  const patientId = params.id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [rdvs, setRdvs] = useState<RdvCalendarRow[]>([])
  const [actes, setActes] = useState<Acte[]>([])
  const [paiements, setPaiements] = useState<PaiementAvecActe[]>([])
  const [openRdv, setOpenRdv] = useState(false)
  const [openActe, setOpenActe] = useState(false)
  const [acteEditionId, setActeEditionId] = useState<string | null>(null)
  const [editInfos, setEditInfos] = useState(false)
  const [selectedActeId, setSelectedActeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [selectedRdvDetail, setSelectedRdvDetail] = useState<RdvCalendarRow | null>(null)
  const [rdvDetailStatut, setRdvDetailStatut] = useState("planifie")

  const [patientForm, setPatientForm] = useState({
    nom: "",
    prenom: "",
    sexe: "",
    date_naissance: "",
    telephone: "",
    telephone_whatsapp: "",
    email: "",
    adresse: "",
    ville: "",
    groupe_sanguin: "",
    allergies: "",
    antecedents_medicaux: "",
    antecedents_dentaires: "",
    notes_generales: "",
    actif: true,
  })

  const [rdvForm, setRdvForm] = useState({
    date_rdv: "",
    motif: "",
    duree_minutes: "30",
    notes: "",
  })

  const [acteForm, setActeForm] = useState({
    date_acte: "",
    type_acte: "",
    dent_numero: "",
    description: "",
    montant_total: "0",
    montant_paye: "0",
  })

  const [paiementForm, setPaiementForm] = useState({
    montant: "",
    date_paiement: "",
    mode_paiement: "especes",
    notes: "",
  })

  const [openAccessModal, setOpenAccessModal] = useState(false)
  const [accessEmail, setAccessEmail] = useState("")
  const [accessPassword, setAccessPassword] = useState("")
  const [accessSubmitting, setAccessSubmitting] = useState(false)
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false)
  const [patientLoginUrl, setPatientLoginUrl] = useState(() => getPatientLoginUrl())
  const [showAccessPassword, setShowAccessPassword] = useState(false)

  useEffect(() => {
    setPatientLoginUrl(getPatientLoginUrl())
  }, [])

  const absolutePatientLoginUrl = useMemo(() => {
    const u = patientLoginUrl.trim()
    if (u.startsWith("http://") || u.startsWith("https://")) return u
    if (typeof window !== "undefined") {
      return u.startsWith("/") ? `${window.location.origin}${u}` : `${window.location.origin}/${u}`
    }
    return u
  }, [patientLoginUrl])

  async function copierVersPressePapiers(text: string, messageSucces: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(messageSucces)
    } catch {
      toast.error("Copie impossible.")
    }
  }

  const chargerFiche = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const [patientQ, rdvQ, actesQ, paiementsQ] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).single(),
        supabase
          .from("rendez_vous")
          .select("*")
          .eq("patient_id", patientId)
          .order("date_rdv", { ascending: true }),
        supabase
          .from("actes")
          .select("*")
          .eq("patient_id", patientId)
          .order("date_acte", { ascending: false }),
        supabase
          .from("paiements")
          .select("*, actes(type_acte)")
          .eq("patient_id", patientId)
          .order("date_paiement", { ascending: false }),
      ])
      if (patientQ.error) throw patientQ.error
      if (rdvQ.error) throw rdvQ.error
      if (actesQ.error) throw actesQ.error
      if (paiementsQ.error) throw paiementsQ.error

      const p = patientQ.data as Patient
      setPatient(p)
      setRdvs((rdvQ.data as RdvCalendarRow[]) ?? [])
      setActes((actesQ.data as Acte[]) ?? [])
      setPaiements((paiementsQ.data as PaiementAvecActe[]) ?? [])
      setPatientForm({
        nom: p.nom ?? "",
        prenom: p.prenom ?? "",
        sexe: p.sexe ?? "",
        date_naissance: p.date_naissance ?? "",
        telephone: p.telephone ?? "",
        telephone_whatsapp: p.telephone_whatsapp ?? "",
        email: p.email ?? "",
        adresse: p.adresse ?? "",
        ville: p.ville ?? "",
        groupe_sanguin: p.groupe_sanguin ?? "",
        allergies: p.allergies ?? "",
        antecedents_medicaux: p.antecedents_medicaux ?? "",
        antecedents_dentaires: p.antecedents_dentaires ?? "",
        notes_generales: p.notes_generales ?? "",
        actif: p.actif !== false,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger la fiche patient.")
    } finally {
      setLoading(false)
    }
  }, [patientId])

  async function sauvegarderInfos() {
    if (!patientId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          nom: patientForm.nom.trim(),
          prenom: patientForm.prenom.trim(),
          sexe: patientForm.sexe || null,
          date_naissance: patientForm.date_naissance || null,
          telephone: patientForm.telephone.trim(),
          telephone_whatsapp: patientForm.telephone_whatsapp.trim() || null,
          email: patientForm.email.trim() || null,
          adresse: patientForm.adresse.trim() || null,
          ville: patientForm.ville.trim() || null,
          groupe_sanguin: patientForm.groupe_sanguin || null,
          allergies: patientForm.allergies.trim() || null,
          antecedents_medicaux: patientForm.antecedents_medicaux.trim() || null,
          antecedents_dentaires: patientForm.antecedents_dentaires.trim() || null,
          notes_generales: patientForm.notes_generales.trim() || null,
          actif: patientForm.actif,
        })
        .eq("id", patientId)
      if (error) throw error
      toast.success("Informations patient mises à jour.")
      setEditInfos(false)
      await chargerFiche()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible.")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (openRdv) {
      setRdvForm({
        date_rdv: toDatetimeLocalValue(new Date()),
        motif: "",
        duree_minutes: "30",
        notes: "",
      })
    }
  }, [openRdv])

  useEffect(() => {
    if (!openActe) return
    if (acteEditionId) {
      const a = actes.find((x) => x.id === acteEditionId)
      if (a) {
        const d = a.date_acte
        const dateStr = typeof d === "string" ? d.slice(0, 10) : todayISODate()
        setActeForm({
          date_acte: dateStr,
          type_acte: a.type_acte,
          dent_numero: a.dent_numero ?? "",
          description: a.description ?? "",
          montant_total: String(a.montant_total),
          montant_paye: String(a.montant_paye),
        })
      }
    } else {
      setActeForm({
        date_acte: todayISODate(),
        type_acte: "",
        dent_numero: "",
        description: "",
        montant_total: "0",
        montant_paye: "0",
      })
    }
  }, [openActe, acteEditionId, actes])

  useEffect(() => {
    if (!selectedActeId) return
    const acte = actes.find((a) => a.id === selectedActeId)
    if (!acte) return
    const restant = Math.max(0, Number(acte.montant_total) - Number(acte.montant_paye))
    setPaiementForm({
      montant: restant > 0 ? String(restant) : "",
      date_paiement: todayISODate(),
      mode_paiement: "especes",
      notes: "",
    })
  }, [selectedActeId, actes])

  useEffect(() => {
    if (selectedRdvDetail) {
      setRdvDetailStatut(selectedRdvDetail.statut || "planifie")
    }
  }, [selectedRdvDetail])

  async function ajouterRdv() {
    if (!patientId) return
    setSaving(true)
    try {
      const { error } = await supabase.from("rendez_vous").insert({
        patient_id: patientId,
        date_rdv: new Date(rdvForm.date_rdv).toISOString(),
        motif: rdvForm.motif || null,
        duree_minutes: Number(rdvForm.duree_minutes),
        notes: rdvForm.notes || null,
        statut: "planifie",
      })
      if (error) throw error
      toast.success("Rendez-vous ajouté !")
      setOpenRdv(false)
      await chargerFiche()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'ajouter le rendez-vous.")
    } finally {
      setSaving(false)
    }
  }

  async function sauverStatutRdv() {
    if (!selectedRdvDetail) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("rendez_vous")
        .update({ statut: rdvDetailStatut })
        .eq("id", selectedRdvDetail.id)
      if (error) throw error
      toast.success("Statut du rendez-vous mis à jour.")
      setSelectedRdvDetail(null)
      await chargerFiche()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible.")
    } finally {
      setSaving(false)
    }
  }

  async function sauvegarderActe() {
    if (!patientId) return
    const total = Number(acteForm.montant_total)
    if (Number.isNaN(total) || total <= 0) {
      toast.error("Le montant total est requis et doit être supérieur à 0.")
      return
    }
    const paye = Number(acteForm.montant_paye) || 0
    if (paye < 0 || paye > total) {
      toast.error("Montant payé invalide (entre 0 et le total).")
      return
    }
    const statut = paye <= 0 ? "non_paye" : paye < total ? "partiel" : "paye"

    setSaving(true)
    try {
      if (acteEditionId) {
        const { error } = await supabase
          .from("actes")
          .update({
            date_acte: acteForm.date_acte,
            type_acte: acteForm.type_acte.trim(),
            dent_numero: acteForm.dent_numero.trim() || null,
            description: acteForm.description.trim() || null,
            montant_total: total,
            montant_paye: paye,
            statut_paiement: statut,
          })
          .eq("id", acteEditionId)
        if (error) throw error
        toast.success("Acte mis à jour !")
      } else {
        const { error } = await supabase.from("actes").insert({
          patient_id: patientId,
          date_acte: acteForm.date_acte,
          type_acte: acteForm.type_acte.trim(),
          dent_numero: acteForm.dent_numero.trim() || null,
          description: acteForm.description.trim() || null,
          montant_total: total,
          montant_paye: paye,
          statut_paiement: statut,
        })
        if (error) throw error
        toast.success("Acte ajouté !")
      }
      setOpenActe(false)
      setActeEditionId(null)
      await chargerFiche()
    } catch (error) {
      console.error("[sauvegarderActe]", error)
      toast.error(getErrorMessage(error, "Impossible d'enregistrer l'acte."))
    } finally {
      setSaving(false)
    }
  }

  async function supprimerActe(acteId: string, libelleType: string) {
    if (
      !window.confirm(
        `Supprimer l'acte « ${libelleType} » ? Les paiements liés seront supprimés.`,
      )
    ) {
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from("actes").delete().eq("id", acteId)
      if (error) throw error
      toast.success("Acte supprimé.")
      if (selectedActeId === acteId) setSelectedActeId(null)
      if (acteEditionId === acteId) {
        setActeEditionId(null)
        setOpenActe(false)
      }
      await chargerFiche()
    } catch (error) {
      console.error("[supprimerActe]", error)
      toast.error(getErrorMessage(error, "Suppression impossible."))
    } finally {
      setSaving(false)
    }
  }

  async function supprimerPatientCourant() {
    if (!patientId) return
    if (
      !window.confirm(
        "Supprimer définitivement ce patient ? Toutes les données liées (RDV, actes, paiements) seront supprimées.",
      )
    ) {
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from("patients").delete().eq("id", patientId)
      if (error) throw error
      toast.success("Patient supprimé.")
      router.push("/patients")
    } catch (error) {
      console.error("[supprimerPatientCourant]", error)
      toast.error(getErrorMessage(error, "Suppression impossible."))
    } finally {
      setSaving(false)
    }
  }

  async function ajouterPaiement() {
    if (!patientId || !selectedActeId) return
    const acte = actes.find((a) => a.id === selectedActeId)
    if (!acte) {
      toast.error("Acte introuvable.")
      return
    }
    const montant = Number(paiementForm.montant)
    const restant = Math.max(0, Number(acte.montant_total) - Number(acte.montant_paye))

    if (Number.isNaN(montant) || montant <= 0) {
      toast.error("Montant invalide")
      return
    }
    if (montant > restant) {
      toast.error("Montant dépasse le restant dû")
      return
    }

    setSaving(true)
    try {
      const { error: insertErr } = await supabase.from("paiements").insert({
        acte_id: selectedActeId,
        patient_id: patientId,
        montant,
        date_paiement: paiementForm.date_paiement,
        mode_paiement: paiementForm.mode_paiement,
        notes: paiementForm.notes || null,
      })
      if (insertErr) throw insertErr

      const nouveauPaye = Number(acte.montant_paye) + montant
      const statut =
        nouveauPaye >= Number(acte.montant_total)
          ? "paye"
          : nouveauPaye > 0
            ? "partiel"
            : "non_paye"

      const { error: updateErr } = await supabase
        .from("actes")
        .update({
          montant_paye: nouveauPaye,
          statut_paiement: statut,
        })
        .eq("id", selectedActeId)
      if (updateErr) throw updateErr

      toast.success("Paiement enregistré !")
      setSelectedActeId(null)
      setPaiementForm({ montant: "", date_paiement: "", mode_paiement: "especes", notes: "" })
      await chargerFiche()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout du paiement impossible.")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void chargerFiche()
    }, 0)
    return () => clearTimeout(timer)
  }, [chargerFiche])

  const totauxActes = useMemo(() => {
    let total = 0
    let paye = 0
    for (const a of actes) {
      total += Number(a.montant_total) || 0
      paye += Number(a.montant_paye) || 0
    }
    return { total, paye, reste: Math.max(0, total - paye) }
  }, [actes])

  const pctPaye = useMemo(() => {
    if (totauxActes.total <= 0) return 0
    return Math.min(100, (totauxActes.paye / totauxActes.total) * 100)
  }, [totauxActes])

  const progressColor =
    pctPaye >= 100 ? "bg-emerald-500" : pctPaye >= 50 ? "bg-amber-500" : "bg-red-500"

  async function creerComptePatient() {
    if (!patientId || !patient) return
    const email = accessEmail.trim()
    if (!email || !email.includes("@")) {
      toast.error("Indiquez une adresse email valide pour la fiche (champ Email ci-dessus).")
      return
    }
    if (!accessPassword.trim()) {
      toast.error("Définissez un mot de passe temporaire pour le patient.")
      return
    }
    setAccessSubmitting(true)
    try {
      const password = accessPassword
      const response = await fetch("/api/create-patient-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, patientId }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "Erreur création compte")
      }
      toast.success("Compte patient créé !")
      setOpenAccessModal(false)
      await chargerFiche()
      const waUrl = genererLienWhatsAppAccesPatient(
        patient.telephone,
        patient.prenom,
        email,
        password,
      )
      const digits = patient.telephone.replace(/\D/g, "")
      if (digits.length >= 8) {
        window.open(waUrl, "_blank", "noopener,noreferrer")
      } else {
        toast.info(
          "Ajoutez un numéro de téléphone valide sur la fiche pour ouvrir WhatsApp automatiquement.",
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création du compte.")
    } finally {
      setAccessSubmitting(false)
    }
  }

  async function reinitialiserMotDePassePatient() {
    if (!patientId) return
    if (
      !window.confirm(
        "Générer un nouveau mot de passe ? L’ancien ne fonctionnera plus. Le patient devra utiliser le nouveau.",
      )
    ) {
      return
    }
    setResetPasswordSubmitting(true)
    try {
      const response = await fetch("/api/reset-patient-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      })
      const data = (await response.json()) as { error?: string; password?: string }
      if (!response.ok) {
        throw new Error(data.error || "Réinitialisation impossible")
      }
      toast.success("Mot de passe réinitialisé.")
      setShowAccessPassword(true)
      await chargerFiche()
      if (data.password) {
        void copierVersPressePapiers(data.password, "Nouveau mot de passe copié !")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Réinitialisation impossible.")
    } finally {
      setResetPasswordSubmitting(false)
    }
  }

  const selectedActe = selectedActeId ? actes.find((a) => a.id === selectedActeId) : undefined
  const restantSelectedActe = selectedActe
    ? Math.max(0, Number(selectedActe.montant_total) - Number(selectedActe.montant_paye))
    : 0

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  if (!patient) {
    return <p className="text-red-600">Patient introuvable.</p>
  }

  const initials = `${patient.prenom[0] ?? ""}${patient.nom[0] ?? ""}`.toUpperCase()
  const age = patient.date_naissance
    ? `${new Date().getFullYear() - new Date(patient.date_naissance).getFullYear()} ans`
    : "-"

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-500 p-6 text-white">
        <Link href="/patients" className="mb-4 inline-flex items-center gap-2 text-sm text-white/90 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/25 text-2xl font-semibold">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {patient.prenom} {patient.nom}
              </h1>
              <p className="text-white/90">
                {age} - {patient.sexe || "Non renseigné"}
              </p>
              <a
                href={genererLienWhatsApp(
                  patient.nom,
                  patient.prenom,
                  patient.telephone,
                  new Date().toISOString(),
                )}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-white/90 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
                {patient.telephone}
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-lg border-0 bg-white px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-white/90"
              onClick={() => setEditInfos(true)}
            >
              Modifier
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-red-200/80 bg-white/90 px-3 py-2 text-red-700 hover:bg-red-50"
              disabled={saving}
              onClick={() => void supprimerPatientCourant()}
              aria-label="Supprimer le patient"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Accès patient mobile</p>
        <p className="mt-1 text-xs text-slate-500">
          Le patient utilise uniquement son téléphone : connexion en lecture seule avec l&apos;email et le mot de passe
          que vous transmettez (lien {patientLoginUrl}).
        </p>
        {patient.auth_user_id ? (
          <Card className="mt-4 border-2 border-emerald-300 bg-emerald-50/40 shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-700" aria-hidden />
                <h3 className="text-base font-semibold text-slate-900">Accès actif</h3>
                <Badge className="border-0 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Connecté
                </Badge>
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Informations d&apos;accès patient
              </p>

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-sm text-slate-500">Lien de connexion</span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-[70%]">
                  <span className="truncate text-right font-mono text-sm font-medium text-blue-600">
                    {absolutePatientLoginUrl}
                  </span>
                  <button
                    type="button"
                    className="inline-flex shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-800"
                    aria-label="Copier le lien"
                    onClick={() => void copierVersPressePapiers(absolutePatientLoginUrl, "Lien copié !")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-sm text-slate-500">Email</span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-[70%]">
                  <span className="truncate text-right font-mono text-sm text-slate-800">
                    {patient.email ?? "—"}
                  </span>
                  {patient.email ? (
                    <button
                      type="button"
                      className="inline-flex shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-800"
                      aria-label="Copier l'email"
                      onClick={() => void copierVersPressePapiers(patient.email!, "Email copié !")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-sm text-slate-500">Mot de passe</span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:max-w-[70%]">
                  <span className="truncate text-right font-mono text-sm text-slate-800">
                    {showAccessPassword
                      ? patient.mot_de_passe_temp ?? "—"
                      : "••••••••"}
                  </span>
                  <button
                    type="button"
                    className="inline-flex shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-800 disabled:opacity-40"
                    aria-label={showAccessPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    disabled={!patient.mot_de_passe_temp}
                    onClick={() => setShowAccessPassword((v) => !v)}
                  >
                    {showAccessPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="inline-flex shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-800 disabled:opacity-40"
                    aria-label="Copier le mot de passe"
                    disabled={!patient.mot_de_passe_temp}
                    onClick={() => {
                      if (!patient.mot_de_passe_temp) {
                        toast.error("Mot de passe non enregistré.")
                        return
                      }
                      void copierVersPressePapiers(patient.mot_de_passe_temp, "Mot de passe copié !")
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <a
                href={genererLienWhatsAppAccesPatient(
                  patient.telephone,
                  patient.prenom,
                  patient.email ?? "—",
                  patient.mot_de_passe_temp ?? "—",
                )}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants(),
                  "w-full border-0 bg-emerald-600 font-semibold text-white hover:bg-emerald-700",
                )}
              >
                Envoyer par WhatsApp
              </a>

              <Button
                type="button"
                variant="outline"
                className="w-full border-amber-300 text-amber-900 hover:bg-amber-50"
                disabled={resetPasswordSubmitting}
                onClick={() => void reinitialiserMotDePassePatient()}
              >
                {resetPasswordSubmitting ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-4 border border-dashed border-slate-300 bg-slate-50/80 shadow-none">
            <CardContent className="space-y-3 p-4">
              <p className="text-sm text-slate-600">
                Aucun compte mobile : créez un accès pour envoyer le lien et le mot de passe au patient.
              </p>
              <Button
                type="button"
                className="h-11 min-h-[44px] w-full bg-blue-500 text-white hover:bg-blue-600"
                onClick={() => {
                  setAccessEmail(patient.email ?? "")
                  setAccessPassword(generateTempPassword(patient.prenom))
                  setOpenAccessModal(true)
                }}
              >
                Créer l&apos;accès mobile
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <Tabs defaultValue="infos" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
          <TabsTrigger value="infos">Informations</TabsTrigger>
          <TabsTrigger value="rdv">Rendez-vous</TabsTrigger>
          <TabsTrigger value="actes">Actes</TabsTrigger>
          <TabsTrigger value="paiements">Paiements</TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <InfoItem label="Prénom" value={patient.prenom} />
              <InfoItem label="Nom" value={patient.nom} />
              <InfoItem
                label="Date de naissance"
                value={
                  patient.date_naissance
                    ? `${formatDateTN(patient.date_naissance)} (${ageFromBirth(patient.date_naissance) ?? "—"})`
                    : null
                }
              />
              <InfoItem label="Sexe" value={patient.sexe} />
              <InfoItem label="Téléphone" value={patient.telephone} />
              <InfoItem label="Téléphone WhatsApp" value={patient.telephone_whatsapp} />
              <InfoItem label="Email" value={patient.email} />
              <InfoItem label="Adresse" value={patient.adresse} />
              <InfoItem label="Ville" value={patient.ville} />
              <InfoItem label="Groupe sanguin" value={patient.groupe_sanguin} />
              <InfoItem label="Allergies" value={patient.allergies} />
              <div className="md:col-span-2">
                <InfoItem label="Antécédents médicaux" value={patient.antecedents_medicaux} />
              </div>
              <div className="md:col-span-2">
                <InfoItem label="Antécédents dentaires" value={patient.antecedents_dentaires} />
              </div>
              <div className="md:col-span-2">
                <InfoItem label="Notes générales" value={patient.notes_generales} />
              </div>
              <InfoItem
                label="Statut (actif / inactif)"
                value={
                  patient.actif === null || patient.actif === undefined
                    ? null
                    : patient.actif
                      ? "Actif"
                      : "Inactif"
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rdv" className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              className="rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700"
              onClick={() => setOpenRdv(true)}
            >
              Nouveau RDV
            </Button>
          </div>
          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="p-5">
              <RdvBigCalendar
                patientId={patientId!}
                rdvs={rdvs}
                onRefresh={chargerFiche}
                onSelectEvent={(rdv) => setSelectedRdvDetail(rdv)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actes" className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              className="rounded-lg bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
              onClick={() => {
                setActeEditionId(null)
                setOpenActe(true)
              }}
            >
              Nouvel Acte
            </Button>
          </div>
          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="space-y-4 p-5">
              {actes.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun acte.</p>
              ) : (
                actes.map((acte) => {
                  const total = Number(acte.montant_total) || 0
                  const paye = Number(acte.montant_paye) || 0
                  const reste = Math.max(0, total - paye)
                  const soldé = reste <= 0
                  return (
                    <div
                      key={acte.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500">
                            {formatDateTN(acte.date_acte)}
                          </p>
                          <p className="text-lg font-semibold text-slate-900">{acte.type_acte}</p>
                          {acte.dent_numero ? (
                            <Badge variant="secondary" className="border-0 bg-slate-200 text-slate-800">
                              Dent {acte.dent_numero}
                            </Badge>
                          ) : null}
                          {acte.description ? (
                            <p className="max-w-xl text-sm text-slate-600">{acte.description}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-start gap-1">
                          <Badge
                            variant="outline"
                            className={`border ${badgeStatutActeClasses(acte.statut_paiement)}`}
                          >
                            {badgeStatutActeLabel(acte.statut_paiement)}
                          </Badge>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-600 hover:text-sky-700"
                            aria-label="Modifier l'acte"
                            onClick={() => {
                              setActeEditionId(acte.id)
                              setOpenActe(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-600 hover:text-red-600"
                            aria-label="Supprimer l'acte"
                            disabled={saving}
                            onClick={() => void supprimerActe(acte.id, acte.type_acte)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-1 text-sm sm:grid-cols-3">
                        <p>
                          <span className="text-slate-500">Total : </span>
                          <span className="font-semibold text-slate-900">{formatMoneyTND(total)}</span>
                        </p>
                        <p>
                          <span className="text-slate-500">Payé : </span>
                          <span className="font-semibold text-emerald-600">{formatMoneyTND(paye)}</span>
                        </p>
                        <p>
                          <span className="text-slate-500">Restant : </span>
                          <span
                            className={`font-semibold ${soldé ? "text-emerald-600" : "text-red-600"}`}
                          >
                            {formatMoneyTND(reste)}
                          </span>
                        </p>
                      </div>
                      {!soldé ? (
                        <div className="mt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-sky-300 text-sky-800"
                            onClick={() => setSelectedActeId(acte.id)}
                          >
                            Ajouter paiement
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
              {actes.length > 0 ? (
                <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">Totaux</p>
                  <div className="mt-2 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-6">
                    <span>
                      Total tous actes :{" "}
                      <span className="font-semibold">{formatMoneyTND(totauxActes.total)}</span>
                    </span>
                    <span>
                      Total payé :{" "}
                      <span className="font-semibold text-emerald-600">
                        {formatMoneyTND(totauxActes.paye)}
                      </span>
                    </span>
                    <span>
                      Total restant :{" "}
                      <span
                        className={`font-semibold ${totauxActes.reste > 0 ? "text-red-600" : "text-emerald-600"}`}
                      >
                        {formatMoneyTND(totauxActes.reste)}
                      </span>
                    </span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paiements" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-slate-200 bg-slate-100">
              <CardContent className="flex items-start gap-3 p-4">
                <FileText className="mt-0.5 h-8 w-8 text-slate-600" />
                <div>
                  <p className="text-xs font-medium text-slate-600">Total soins</p>
                  <p className="text-lg font-bold text-slate-900">{formatMoneyTND(totauxActes.total)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="flex items-start gap-3 p-4">
                <CheckCircle className="mt-0.5 h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-xs font-medium text-emerald-800">Total payé</p>
                  <p className="text-lg font-bold text-emerald-700">{formatMoneyTND(totauxActes.paye)}</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={
                totauxActes.reste > 0
                  ? "border-red-200 bg-red-50"
                  : "border-emerald-200 bg-emerald-50"
              }
            >
              <CardContent className="flex items-start gap-3 p-4">
                {totauxActes.reste > 0 ? (
                  <AlertCircle className="mt-0.5 h-8 w-8 text-red-600" />
                ) : (
                  <CheckCircle className="mt-0.5 h-8 w-8 text-emerald-600" />
                )}
                <div>
                  <p
                    className={`text-xs font-medium ${totauxActes.reste > 0 ? "text-red-800" : "text-emerald-800"}`}
                  >
                    Reste à payer
                  </p>
                  <p
                    className={`text-lg font-bold ${totauxActes.reste > 0 ? "text-red-700" : "text-emerald-700"}`}
                  >
                    {formatMoneyTND(totauxActes.reste)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Progression du règlement</p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all ${progressColor}`}
                style={{ width: `${pctPaye}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {totauxActes.total <= 0
                ? "0 %"
                : `${pctPaye.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
            </p>
          </div>

          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="p-0 sm:p-2">
              <p className="px-4 py-3 text-sm font-semibold text-slate-800">Détail par acte</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="min-w-[120px] whitespace-normal">Type</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payé</TableHead>
                    <TableHead>Restant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500">
                        Aucun acte.
                      </TableCell>
                    </TableRow>
                  ) : (
                    actes.map((acte) => {
                      const total = Number(acte.montant_total) || 0
                      const paye = Number(acte.montant_paye) || 0
                      const reste = Math.max(0, total - paye)
                      return (
                        <TableRow key={acte.id}>
                          <TableCell>{formatDateTN(acte.date_acte)}</TableCell>
                          <TableCell className="whitespace-normal">{acte.type_acte}</TableCell>
                          <TableCell>{formatMoneyTND(total)}</TableCell>
                          <TableCell className="font-medium text-emerald-600">{formatMoneyTND(paye)}</TableCell>
                          <TableCell className={reste > 0 ? "font-medium text-red-600" : "text-emerald-600"}>
                            {formatMoneyTND(reste)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`border ${badgeStatutActeClasses(acte.statut_paiement)}`}
                            >
                              {badgeStatutActeLabel(acte.statut_paiement)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-600 hover:text-sky-700"
                                aria-label="Modifier l'acte"
                                onClick={() => {
                                  setActeEditionId(acte.id)
                                  setOpenActe(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-600 hover:text-red-600"
                                aria-label="Supprimer l'acte"
                                disabled={saving}
                                onClick={() => void supprimerActe(acte.id, acte.type_acte)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {reste > 0 ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  aria-label="Ajouter paiement"
                                  onClick={() => setSelectedActeId(acte.id)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-semibold text-slate-800">Historique des paiements</p>
              {paiements.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun paiement enregistré.</p>
              ) : (
                paiements.map((pay) => (
                  <div
                    key={pay.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-500">{formatDateTN(pay.date_paiement)}</p>
                        <p className="text-sm font-medium text-slate-800">
                          {pay.actes?.type_acte ?? "Acte"}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-emerald-600">{formatMoneyTND(Number(pay.montant))}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <ModePaiementIcon mode={pay.mode_paiement} />
                      <span>{labelModePaiement(pay.mode_paiement)}</span>
                    </div>
                    {pay.notes ? (
                      <p className="mt-2 text-sm text-slate-500">{pay.notes}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editInfos} onOpenChange={setEditInfos}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier patient</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Prénom</Label>
              <Input
                value={patientForm.prenom}
                onChange={(e) => setPatientForm((s) => ({ ...s, prenom: e.target.value }))}
              />
            </div>
            <div>
              <Label>Nom</Label>
              <Input
                value={patientForm.nom}
                onChange={(e) => setPatientForm((s) => ({ ...s, nom: e.target.value }))}
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={patientForm.telephone}
                onChange={(e) => setPatientForm((s) => ({ ...s, telephone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Téléphone WhatsApp</Label>
              <Input
                value={patientForm.telephone_whatsapp}
                onChange={(e) => setPatientForm((s) => ({ ...s, telephone_whatsapp: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={patientForm.email}
                onChange={(e) => setPatientForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Adresse</Label>
              <Input
                value={patientForm.adresse}
                onChange={(e) => setPatientForm((s) => ({ ...s, adresse: e.target.value }))}
              />
            </div>
            <div>
              <Label>Ville</Label>
              <Input
                value={patientForm.ville}
                onChange={(e) => setPatientForm((s) => ({ ...s, ville: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date naissance</Label>
              <Input
                type="date"
                value={patientForm.date_naissance}
                onChange={(e) => setPatientForm((s) => ({ ...s, date_naissance: e.target.value }))}
              />
            </div>
            <div>
              <Label>Sexe</Label>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={patientForm.sexe}
                onChange={(e) => setPatientForm((s) => ({ ...s, sexe: e.target.value }))}
              >
                <option value="">—</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
            </div>
            <div>
              <Label>Groupe sanguin</Label>
              <Input
                value={patientForm.groupe_sanguin}
                onChange={(e) => setPatientForm((s) => ({ ...s, groupe_sanguin: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="actif-check"
                type="checkbox"
                checked={patientForm.actif}
                onChange={(e) => setPatientForm((s) => ({ ...s, actif: e.target.checked }))}
              />
              <Label htmlFor="actif-check">Patient actif</Label>
            </div>
            <div className="md:col-span-2">
              <Label>Allergies</Label>
              <Textarea
                value={patientForm.allergies}
                onChange={(e) => setPatientForm((s) => ({ ...s, allergies: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Antécédents médicaux</Label>
              <Textarea
                value={patientForm.antecedents_medicaux}
                onChange={(e) => setPatientForm((s) => ({ ...s, antecedents_medicaux: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Antécédents dentaires</Label>
              <Textarea
                value={patientForm.antecedents_dentaires}
                onChange={(e) => setPatientForm((s) => ({ ...s, antecedents_dentaires: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={patientForm.notes_generales}
                onChange={(e) => setPatientForm((s) => ({ ...s, notes_generales: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditInfos(false)}>
              Annuler
            </Button>
            <Button onClick={sauvegarderInfos} disabled={saving}>
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openRdv} onOpenChange={setOpenRdv}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau rendez-vous</DialogTitle>
            <DialogDescription>Planifier un rendez-vous pour ce patient</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Date et heure</Label>
            <Input
              type="datetime-local"
              value={rdvForm.date_rdv}
              onChange={(e) => setRdvForm((s) => ({ ...s, date_rdv: e.target.value }))}
            />
            <Label>Motif</Label>
            <Input
              value={rdvForm.motif}
              onChange={(e) => setRdvForm((s) => ({ ...s, motif: e.target.value }))}
            />
            <Label>Durée</Label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={rdvForm.duree_minutes}
              onChange={(e) => setRdvForm((s) => ({ ...s, duree_minutes: e.target.value }))}
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
            <Label>Notes</Label>
            <Textarea
              value={rdvForm.notes}
              onChange={(e) => setRdvForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenRdv(false)}>
              Annuler
            </Button>
            <Button onClick={ajouterRdv} disabled={saving}>
              {saving ? "Enregistrement..." : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRdvDetail} onOpenChange={(o) => !o && setSelectedRdvDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Détail du rendez-vous</DialogTitle>
          </DialogHeader>
          {selectedRdvDetail ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-slate-500">Date et heure : </span>
                <span className="font-medium">
                  {formatDateTN(selectedRdvDetail.date_rdv)}{" "}
                  {new Date(selectedRdvDetail.date_rdv).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Motif : </span>
                {selectedRdvDetail.motif || "—"}
              </p>
              <p>
                <span className="text-slate-500">Durée : </span>
                {selectedRdvDetail.duree_minutes ?? 30} min
              </p>
              <div>
                <Label>Statut</Label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={rdvDetailStatut}
                  onChange={(e) => setRdvDetailStatut(e.target.value)}
                >
                  {RDV_STATUTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <p>
                <span className="text-slate-500">Notes : </span>
                {selectedRdvDetail.notes || "—"}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href={genererLienWhatsApp(
                    patient.nom,
                    patient.prenom,
                    patient.telephone,
                    selectedRdvDetail.date_rdv,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  WhatsApp rappel
                </a>
                <Button type="button" size="sm" onClick={sauverStatutRdv} disabled={saving}>
                  Enregistrer le statut
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openActe}
        onOpenChange={(open) => {
          setOpenActe(open)
          if (!open) setActeEditionId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{acteEditionId ? "Modifier l'acte" : "Nouvel acte"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Date de l&apos;acte</Label>
            <Input
              type="date"
              value={acteForm.date_acte}
              onChange={(e) => setActeForm((s) => ({ ...s, date_acte: e.target.value }))}
            />
            <Label>Type d&apos;acte</Label>
            <Input
              value={acteForm.type_acte}
              onChange={(e) => setActeForm((s) => ({ ...s, type_acte: e.target.value }))}
              placeholder="Ex. Détartrage, Extraction…"
            />
            <Label>Numéro de dent (optionnel)</Label>
            <Input
              value={acteForm.dent_numero}
              onChange={(e) => setActeForm((s) => ({ ...s, dent_numero: e.target.value }))}
            />
            <Label>Description (optionnel)</Label>
            <Textarea
              value={acteForm.description}
              onChange={(e) => setActeForm((s) => ({ ...s, description: e.target.value }))}
            />
            <Label>Montant total (TND)</Label>
            <Input
              type="number"
              min={0}
              step="0.001"
              value={acteForm.montant_total}
              onChange={(e) => setActeForm((s) => ({ ...s, montant_total: e.target.value }))}
            />
            <Label>Montant payé (défaut 0)</Label>
            <Input
              type="number"
              min={0}
              step="0.001"
              value={acteForm.montant_paye}
              onChange={(e) => setActeForm((s) => ({ ...s, montant_paye: e.target.value }))}
            />
            <p className="text-xs text-slate-500">
              Le statut de paiement est calculé automatiquement à partir des montants.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpenActe(false)
                setActeEditionId(null)
              }}
            >
              Annuler
            </Button>
            <Button onClick={() => void sauvegarderActe()} disabled={saving}>
              {saving ? "Enregistrement..." : acteEditionId ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedActeId} onOpenChange={(open) => !open && setSelectedActeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Paiement pour {selectedActe?.type_acte ?? "l'acte"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Restant à payer :{" "}
              <span className="font-semibold text-slate-900">{formatMoneyTND(restantSelectedActe)}</span>
            </p>
            <Label>Montant</Label>
            <Input
              type="number"
              min={0}
              step="0.001"
              max={restantSelectedActe || undefined}
              value={paiementForm.montant}
              onChange={(e) => setPaiementForm((s) => ({ ...s, montant: e.target.value }))}
            />
            <Label>Date du paiement</Label>
            <Input
              type="date"
              value={paiementForm.date_paiement}
              onChange={(e) => setPaiementForm((s) => ({ ...s, date_paiement: e.target.value }))}
            />
            <Label>Mode de paiement</Label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={paiementForm.mode_paiement}
              onChange={(e) => setPaiementForm((s) => ({ ...s, mode_paiement: e.target.value }))}
            >
              <option value="especes">Espèces</option>
              <option value="cheque">Chèque</option>
              <option value="carte_bancaire">Carte bancaire</option>
              <option value="virement">Virement</option>
            </select>
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={paiementForm.notes}
              onChange={(e) => setPaiementForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedActeId(null)}>
              Annuler
            </Button>
            <Button onClick={ajouterPaiement} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer le paiement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openAccessModal} onOpenChange={setOpenAccessModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer l&apos;accès mobile</DialogTitle>
            <DialogDescription>
              Un compte sera créé côté authentification et lié à cette fiche. Par défaut : mot de passe du type{" "}
              <strong>Prenom2024!</strong> (modifiable).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label>Mot de passe (affiché pour le copier-coller)</Label>
              <Input
                type="text"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label>Aperçu du message WhatsApp</Label>
              <Textarea
                readOnly
                className="min-h-[180px] resize-none font-mono text-xs"
                value={messageAccesPatientMobile(
                  patient.prenom,
                  accessEmail.trim() || patient.email || "email@exemple.tn",
                  accessPassword || "••••••••",
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenAccessModal(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                className="bg-blue-500 text-white hover:bg-blue-600"
                onClick={() => void creerComptePatient()}
                disabled={accessSubmitting}
              >
                {accessSubmitting ? "Création..." : "Créer et envoyer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
