"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/errors"
import { supabase } from "@/lib/supabase"

export type PatientProfile = {
  id: string
  nom: string
  prenom: string
  email: string | null
  telephone: string
  date_naissance: string | null
  groupe_sanguin: string | null
  ville: string | null
  allergies: string | null
  auth_user_id: string | null
}

export type PatientRdv = {
  id: string
  date_rdv: string
  motif: string | null
  statut: string
  notes: string | null
  duree_minutes: number | null
}

export type PatientActe = {
  id: string
  date_acte: string
  type_acte: string
  dent_numero: string | null
  description: string | null
  montant_total: number
  montant_paye: number
  statut_paiement: string
}

export type PatientPaiement = {
  id: string
  acte_id: string
  patient_id: string
  montant: number
  date_paiement: string
  mode_paiement: string | null
  notes: string | null
  actes: { type_acte: string } | null
}

const PATIENT_SELECT =
  "id, nom, prenom, email, telephone, date_naissance, groupe_sanguin, ville, allergies, auth_user_id"

export type UseRealtimePatientResult = {
  loading: boolean
  error: string | null
  user: User | null
  patient: PatientProfile | null
  /** Aucune ligne `patients` après recherche par auth_user_id puis par email exact */
  patientNotFound: boolean
  rdvs: PatientRdv[]
  actes: PatientActe[]
  paiements: PatientPaiement[]
  totals: {
    total: number
    paye: number
    restant: number
    progress: number
  }
  refetch: () => Promise<void>
}

export function useRealtimePatient(): UseRealtimePatientResult {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const [rdvs, setRdvs] = useState<PatientRdv[]>([])
  const [actes, setActes] = useState<PatientActe[]>([])
  const [paiements, setPaiements] = useState<PatientPaiement[]>([])
  const [patientNotFound, setPatientNotFound] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    try {
      const [pRes, rdvRes, actesRes, payRes] = await Promise.all([
        supabase.from("patients").select(PATIENT_SELECT).eq("id", patientId).single(),
        supabase
          .from("rendez_vous")
          .select("id, date_rdv, motif, statut, notes, duree_minutes")
          .eq("patient_id", patientId)
          .order("date_rdv", { ascending: true }),
        supabase
          .from("actes")
          .select("id, date_acte, type_acte, dent_numero, description, montant_total, montant_paye, statut_paiement")
          .eq("patient_id", patientId)
          .order("date_acte", { ascending: false }),
        supabase
          .from("paiements")
          .select("*, actes(type_acte)")
          .eq("patient_id", patientId)
          .order("date_paiement", { ascending: false }),
      ])

      if (pRes.error) throw pRes.error
      if (rdvRes.error) throw rdvRes.error
      if (actesRes.error) throw actesRes.error
      if (payRes.error) throw payRes.error

      setPatient(pRes.data as PatientProfile)
      setRdvs((rdvRes.data as PatientRdv[]) ?? [])
      setActes((actesRes.data as PatientActe[]) ?? [])
      setPaiements((payRes.data as PatientPaiement[]) ?? [])
    } catch (e) {
      setError(getErrorMessage(e, "Erreur chargement espace patient."))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setPatientNotFound(false)

      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (authErr) {
        setError(authErr.message)
        setLoading(false)
        setPatientNotFound(false)
        return
      }

      if (!user) {
        router.replace("/patient/login")
        setUser(null)
        setPatientId(null)
        setPatient(null)
        setRdvs([])
        setActes([])
        setPaiements([])
        setPatientNotFound(false)
        setLoading(false)
        return
      }

      setUser(user)

      const { data: rowByAuth, error: errAuth } = await supabase
        .from("patients")
        .select(PATIENT_SELECT)
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (cancelled) return

      if (errAuth) {
        setError(errAuth.message)
        setLoading(false)
        setPatientNotFound(false)
        return
      }

      if (rowByAuth) {
        const row = rowByAuth as PatientProfile
        setPatient(row)
        setPatientId(row.id)
        setPatientNotFound(false)
        return
      }

      if (!user.email) {
        setPatientId(null)
        setPatient(null)
        setRdvs([])
        setActes([])
        setPaiements([])
        setPatientNotFound(true)
        setLoading(false)
        return
      }

      const { data: byEmail, error: errEmail } = await supabase
        .from("patients")
        .select(PATIENT_SELECT)
        .eq("email", user.email)
        .maybeSingle()

      if (cancelled) return

      if (errEmail) {
        setError(errEmail.message)
        setLoading(false)
        setPatientNotFound(false)
        return
      }

      if (byEmail) {
        const { error: linkErr } = await supabase
          .from("patients")
          .update({ auth_user_id: user.id })
          .eq("id", byEmail.id)

        if (cancelled) return

        if (linkErr) {
          setError(linkErr.message)
          setLoading(false)
          return
        }

        const { data: linked, error: refErr } = await supabase
          .from("patients")
          .select(PATIENT_SELECT)
          .eq("id", byEmail.id)
          .single()

        if (cancelled) return

        if (refErr || !linked) {
          setError(refErr?.message ?? "Impossible de recharger la fiche patient.")
          setLoading(false)
          return
        }

        const row = linked as PatientProfile
        setPatient(row)
        setPatientId(row.id)
        setPatientNotFound(false)
        return
      }

      setPatientId(null)
      setPatient(null)
      setRdvs([])
      setActes([])
      setPaiements([])
      setPatientNotFound(true)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!patientId) return

    void fetchAll()

    const channel = supabase
      .channel(`patient-portal-realtime-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "patients",
          filter: `id=eq.${patientId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            setPatient((prev) =>
              prev
                ? ({ ...prev, ...(payload.new as Partial<PatientProfile>) } as PatientProfile)
                : (payload.new as PatientProfile),
            )
            toast.info("Vos informations ont été mises à jour")
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rendez_vous",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const row = payload.new as PatientRdv
            setRdvs((prev) => {
              const next = [...prev, row].sort(
                (a, b) => new Date(a.date_rdv).getTime() - new Date(b.date_rdv).getTime(),
              )
              return next
            })
            toast.info("Un rendez-vous a été ajouté")
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rendez_vous",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const row = payload.new as PatientRdv
            setRdvs((prev) => prev.map((r) => (r.id === row.id ? row : r)))
            toast.info("Votre rendez-vous a été mis à jour")
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "rendez_vous",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id
          if (oldId) {
            setRdvs((prev) => prev.filter((r) => r.id !== oldId))
            toast.info("Un rendez-vous a été annulé ou retiré")
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "actes",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const row = payload.new as PatientActe
            setActes((prev) =>
              [row, ...prev].sort(
                (a, b) => new Date(b.date_acte).getTime() - new Date(a.date_acte).getTime(),
              ),
            )
            toast.info("Nouveau soin ajouté par votre dentiste")
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "actes",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const row = payload.new as PatientActe
            setActes((prev) =>
              prev
                .map((a) => (a.id === row.id ? row : a))
                .sort(
                  (a, b) => new Date(b.date_acte).getTime() - new Date(a.date_acte).getTime(),
                ),
            )
            toast.info("Un soin a été mis à jour")
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "actes",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id
          if (oldId) {
            setActes((prev) => prev.filter((a) => a.id !== oldId))
            toast.info("Un soin a été retiré de votre dossier")
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "paiements",
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          void fetchAll()
          toast.success("Paiement enregistré")
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "paiements",
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          void fetchAll()
          toast.success("Paiement enregistré")
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "paiements",
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          void fetchAll()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [patientId, fetchAll])

  const totals = useMemo(() => {
    const total = actes.reduce((sum, a) => sum + Number(a.montant_total || 0), 0)
    const paye = actes.reduce((sum, a) => sum + Number(a.montant_paye || 0), 0)
    return {
      total,
      paye,
      restant: Math.max(0, total - paye),
      progress: total > 0 ? Math.round((paye / total) * 100) : 0,
    }
  }, [actes])

  return {
    loading,
    error,
    user,
    patient,
    patientNotFound,
    rdvs,
    actes,
    paiements,
    totals,
    refetch: fetchAll,
  }
}
