"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { CalendarDays, CalendarPlus, Check, ExternalLink, MessageCircle, Phone, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { CABINET } from "@/lib/cabinet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

type VueType = "today" | "week" | "month"
type RdvStatut = "planifie" | "confirme" | "termine" | "annule" | "absent"

type RdvRow = {
  id: string
  patient_id: string
  date_rdv: string
  duree_minutes: number | null
  motif: string | null
  notes: string | null
  statut: RdvStatut
  patients:
    | {
        id: string
        nom: string
        prenom: string
        telephone: string | null
        telephone_whatsapp: string | null
      }
    | {
        id: string
        nom: string
        prenom: string
        telephone: string | null
        telephone_whatsapp: string | null
      }[]
    | null
}

type PatientSearch = {
  id: string
  nom: string
  prenom: string
  telephone: string | null
  telephone_whatsapp: string | null
}

function toStartOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toEndOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function startOfWeekMonday(date: Date) {
  const d = toStartOfDay(date)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function monthBounds(base: Date) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function titleCaseFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDateFrLong(date: Date) {
  return titleCaseFirst(
    date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  )
}

function formatDateFrDay(date: Date) {
  return titleCaseFirst(date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))
}

function formatTime(dateIso: string) {
  return new Date(dateIso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

const couleursStatut: Record<RdvStatut, string> = {
  planifie: "bg-blue-100 text-blue-700 border-l-4 border-blue-500",
  confirme: "bg-cyan-100 text-cyan-700 border-l-4 border-cyan-500",
  termine: "bg-green-100 text-green-700 border-l-4 border-green-500",
  annule: "bg-red-100 text-red-700 border-l-4 border-red-500",
  absent: "bg-orange-100 text-orange-700 border-l-4 border-orange-500",
}

const labelsStatut: Record<RdvStatut, string> = {
  planifie: "Planifié",
  confirme: "Confirmé",
  termine: "Terminé",
  annule: "Annulé",
  absent: "Absent",
}

const couleursAvatar = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"]

function initials(nom: string, prenom: string) {
  return `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase()
}

function isFutureRdv(dateIso: string) {
  return new Date(dateIso).getTime() > Date.now()
}

function getPatientFromRdv(rdv: RdvRow) {
  if (!rdv.patients) return null
  return Array.isArray(rdv.patients) ? rdv.patients[0] ?? null : rdv.patients
}

function getAvatarColor(prenom: string, nom: string) {
  const p = prenom?.charCodeAt(0) ?? 0
  const n = nom?.charCodeAt(0) ?? 0
  return couleursAvatar[(p + n) % couleursAvatar.length]
}

function genererRappelWhatsApp(patient: PatientSearch, rdv: RdvRow) {
  const brut = patient.telephone_whatsapp || patient.telephone || ""
  const numero = brut.replace(/\D/g, "")
  if (!numero) return null
  const d = new Date(rdv.date_rdv)
  const date = d.toLocaleDateString("fr-TN", { weekday: "long", day: "numeric", month: "long" })
  const heure = d.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })
  const message = `Bonjour ${patient.prenom} ${patient.nom},\n\nRappel de votre rendez-vous :\n📅 ${date}\n⏰ ${heure}\n\nMerci de confirmer votre présence.\n\nCabinet Dentaire ${CABINET.nom}\n📞 ${CABINET.telephone}`
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
}

export default function RendezVousPage() {
  const router = useRouter()
  const [vue, setVue] = useState<VueType>("today")
  const [loading, setLoading] = useState(true)
  const [rdv, setRdv] = useState<RdvRow[]>([])
  const [monthCursor, setMonthCursor] = useState(new Date())
  const [openModal, setOpenModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [patientsResults, setPatientsResults] = useState<PatientSearch[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientSearch | null>(null)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    heure: "09:00",
    duree: "30",
    motif: "",
    notes: "",
  })
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    monthDone: 0,
    monthAbsent: 0,
  })

  const todayLabel = useMemo(() => formatDateFrLong(new Date()), [])

  const dateRange = useMemo(() => {
    const now = new Date()
    if (vue === "today") {
      return { start: toStartOfDay(now), end: toEndOfDay(now) }
    }
    if (vue === "week") {
      const start = startOfWeekMonday(now)
      const end = toEndOfDay(addDays(start, 6))
      return { start, end }
    }
    const { start, end } = monthBounds(monthCursor)
    return { start, end }
  }, [vue, monthCursor])

  async function fetchStats() {
    const now = new Date()
    const todayStart = toStartOfDay(now)
    const todayEnd = toEndOfDay(now)
    const weekStart = startOfWeekMonday(now)
    const weekEnd = toEndOfDay(addDays(weekStart, 6))
    const { start: monthStart, end: monthEnd } = monthBounds(now)

    const [todayQ, weekQ, monthDoneQ, monthAbsentQ] = await Promise.all([
      supabase
        .from("rendez_vous")
        .select("*", { count: "exact", head: true })
        .gte("date_rdv", todayStart.toISOString())
        .lte("date_rdv", todayEnd.toISOString()),
      supabase
        .from("rendez_vous")
        .select("*", { count: "exact", head: true })
        .gte("date_rdv", weekStart.toISOString())
        .lte("date_rdv", weekEnd.toISOString()),
      supabase
        .from("rendez_vous")
        .select("*", { count: "exact", head: true })
        .eq("statut", "termine")
        .gte("date_rdv", monthStart.toISOString())
        .lte("date_rdv", monthEnd.toISOString()),
      supabase
        .from("rendez_vous")
        .select("*", { count: "exact", head: true })
        .eq("statut", "absent")
        .gte("date_rdv", monthStart.toISOString())
        .lte("date_rdv", monthEnd.toISOString()),
    ])

    const firstError = todayQ.error || weekQ.error || monthDoneQ.error || monthAbsentQ.error
    if (firstError) {
      toast.error(firstError.message)
      return
    }

    setStats({
      today: todayQ.count ?? 0,
      week: weekQ.count ?? 0,
      monthDone: monthDoneQ.count ?? 0,
      monthAbsent: monthAbsentQ.count ?? 0,
    })
  }

  async function fetchRdv() {
    setLoading(true)
    const { data, error } = await supabase
      .from("rendez_vous")
      .select(`
        *,
        patients (
          id,
          nom,
          prenom,
          telephone,
          telephone_whatsapp
        )
      `)
      .gte("date_rdv", dateRange.start.toISOString())
      .lte("date_rdv", dateRange.end.toISOString())
      .order("date_rdv", { ascending: true })

    if (error) {
      toast.error(error.message)
      setRdv([])
      setLoading(false)
      return
    }
    setRdv((data as RdvRow[]) ?? [])
    setLoading(false)
  }

  async function changerStatut(rdvId: string, nouveauStatut: RdvStatut) {
    const { error } = await supabase.from("rendez_vous").update({ statut: nouveauStatut }).eq("id", rdvId)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Statut mis à jour")
    await fetchRdv()
    await fetchStats()
  }

  async function supprimerRdv(rdvId: string) {
    const ok = window.confirm("Supprimer ce rendez-vous ? Cette action est irréversible.")
    if (!ok) return

    const { error } = await supabase.from("rendez_vous").delete().eq("id", rdvId)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Rendez-vous supprimé")
    await fetchRdv()
    await fetchStats()
  }

  async function searchPatients(query: string) {
    const q = query.trim()
    if (!q) {
      setPatientsResults([])
      return
    }
    setSearchLoading(true)
    const { data, error } = await supabase
      .from("patients")
      .select("id, nom, prenom, telephone, telephone_whatsapp")
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`)
      .order("nom", { ascending: true })
      .limit(8)
    if (error) {
      toast.error(error.message)
      setSearchLoading(false)
      return
    }
    setPatientsResults((data as PatientSearch[]) ?? [])
    setSearchLoading(false)
  }

  async function createRdv() {
    if (!selectedPatient) {
      toast.error("Sélectionnez un patient.")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("rendez_vous").insert({
      patient_id: selectedPatient.id,
      date_rdv: new Date(`${form.date}T${form.heure}`).toISOString(),
      duree_minutes: Number.parseInt(form.duree, 10),
      motif: form.motif.trim() || null,
      notes: form.notes.trim() || null,
      statut: "planifie",
    })
    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }
    toast.success("Rendez-vous ajouté !")
    setOpenModal(false)
    setSelectedPatient(null)
    setSearch("")
    setPatientsResults([])
    setForm({
      date: new Date().toISOString().slice(0, 10),
      heure: "09:00",
      duree: "30",
      motif: "",
      notes: "",
    })
    await fetchRdv()
    await fetchStats()
    setSaving(false)
  }

  useEffect(() => {
    void fetchRdv()
  }, [dateRange.start.getTime(), dateRange.end.getTime()])

  useEffect(() => {
    void fetchStats()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel("rdv-dentiste")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rendez_vous",
        },
        () => {
          void fetchRdv()
          void fetchStats()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [dateRange.start.getTime(), dateRange.end.getTime()])

  const groupedByDay = useMemo(() => {
    const map = new Map<string, RdvRow[]>()
    for (const item of rdv) {
      const d = new Date(item.date_rdv)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(item)
    }
    return map
  }, [rdv])

  function RdvCard({ item }: { item: RdvRow }) {
    const patient = getPatientFromRdv(item)
    if (!patient) return null
    const reminderUrl = isFutureRdv(item.date_rdv) ? genererRappelWhatsApp(patient, item) : null
    const avatarColor = getAvatarColor(patient.prenom, patient.nom)
    return (
      <Card className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${couleursStatut[item.statut]}`}>
        <div className="flex items-center gap-4">
          <div className="flex min-w-[60px] flex-col items-center rounded-xl bg-blue-50 p-2">
            <span className="text-lg font-bold text-blue-600">{formatTime(item.date_rdv)}</span>
            <span className="text-xs text-gray-400">{item.duree_minutes ?? 30} min</span>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: avatarColor }}
          >
            {initials(patient.nom, patient.prenom)}
          </div>
          <div className="min-w-0 flex-1" onClick={() => router.push(`/patients/${item.patient_id}`)}>
            <p className="truncate font-semibold text-slate-900">
              {patient.prenom} {patient.nom}
            </p>
            <p className="truncate text-sm text-gray-500">{item.motif || "Pas de motif"}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${couleursStatut[item.statut].split(" border-l-4")[0]}`}>
                {labelsStatut[item.statut]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reminderUrl ? (
              <a
                href={reminderUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500 hover:bg-green-600"
              >
                <MessageCircle size={16} className="text-white" />
              </a>
            ) : patient.telephone ? (
              <a
                href={`tel:${patient.telephone}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <Phone size={16} />
              </a>
            ) : null}
            <select
              value={item.statut}
              onChange={(e) => void changerStatut(item.id, e.target.value as RdvStatut)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
            >
              <option value="planifie">Planifié</option>
              <option value="confirme">Confirmé</option>
              <option value="termine">Terminé</option>
              <option value="annule">Annulé</option>
              <option value="absent">Absent</option>
            </select>
            <Link
              href={`/patients/${item.patient_id}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <ExternalLink size={16} />
            </Link>
            <button
              type="button"
              onClick={() => void supprimerRdv(item.id)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-5 bg-slate-50 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Rendez-vous</h1>
        <Button className="h-11 bg-blue-600 hover:bg-blue-700" onClick={() => setOpenModal(true)}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          Nouveau RDV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">RDV aujourd'hui</p>
          <p className="text-2xl font-semibold text-slate-900">{stats.today}</p>
        </Card>
        <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Cette semaine</p>
          <p className="text-2xl font-semibold text-slate-900">{stats.week}</p>
        </Card>
        <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Terminés ce mois</p>
          <p className="text-2xl font-semibold text-green-700">{stats.monthDone}</p>
        </Card>
        <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Absents ce mois</p>
          <p className="text-2xl font-semibold text-orange-600">{stats.monthAbsent}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={vue === "today" ? "default" : "outline"} onClick={() => setVue("today")}>
          Aujourd'hui
        </Button>
        <Button variant={vue === "week" ? "default" : "outline"} onClick={() => setVue("week")}>
          Cette semaine
        </Button>
        <Button variant={vue === "month" ? "default" : "outline"} onClick={() => setVue("month")}>
          Ce mois
        </Button>
      </div>

      <div className="space-y-4 transition-all duration-300">
        {vue === "today" ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{todayLabel}</h2>
              <p className="text-sm text-slate-600">{rdv.length} rendez-vous aujourd'hui</p>
            </div>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
              </div>
            ) : rdv.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                  <CalendarDays size={32} className="text-gray-400" />
                </div>
                <p className="font-medium text-gray-500">Aucun rendez-vous aujourd'hui</p>
                <p className="mt-1 text-sm text-gray-400">Cliquez sur "Nouveau RDV" pour en ajouter un</p>
                <button
                  type="button"
                  onClick={() => setOpenModal(true)}
                  className="mt-4 rounded-xl bg-blue-500 px-4 py-2 text-sm text-white"
                >
                  Nouveau rendez-vous
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {rdv.map((item) => (
                  <RdvCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {vue === "week" ? (
          <section className="space-y-4">
            {Array.from({ length: 7 }).map((_, idx) => {
              const start = startOfWeekMonday(new Date())
              const day = addDays(start, idx)
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
              const list = groupedByDay.get(key) ?? []
              return (
                <Card key={key} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
                    <p className="font-semibold text-slate-800">{formatDateFrDay(day)}</p>
                    <Badge variant="secondary">{list.length} RDV</Badge>
                  </div>
                  {loading ? (
                    <Skeleton className="h-24 rounded-xl" />
                  ) : list.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun rendez-vous</p>
                  ) : (
                    <div className="space-y-3">
                      {list.map((item) => (
                        <RdvCard key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
          </section>
        ) : null}

        {vue === "month" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
              >
                {"<"}
              </Button>
              <h2 className="text-lg font-bold text-slate-900">
                {titleCaseFirst(
                  monthCursor.toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  }),
                )}
              </h2>
              <Button
                variant="outline"
                onClick={() =>
                  setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
              >
                {">"}
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
              </div>
            ) : rdv.length === 0 ? (
              <Card className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-slate-500">
                Aucun rendez-vous ce mois.
              </Card>
            ) : (
              <div className="space-y-4">
                {Array.from(groupedByDay.entries()).map(([key, list]) => {
                  const [year, month, day] = key.split("-").map(Number)
                  const dayDate = new Date(year, month, day)
                  return (
                    <Card key={key} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
                        <p className="font-semibold text-slate-800">{formatDateFrDay(dayDate)}</p>
                        <Badge variant="secondary">{list.length} RDV</Badge>
                      </div>
                      <div className="space-y-3">
                        {list.map((item) => (
                          <RdvCard key={item.id} item={item} />
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouveau RDV</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Patient</Label>
              {selectedPatient ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-900">
                    {selectedPatient.prenom} {selectedPatient.nom}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null)
                      setSearch("")
                    }}
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      void searchPatients(e.target.value)
                    }}
                    placeholder="Rechercher par nom ou prénom..."
                  />
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-100">
                    {searchLoading ? (
                      <p className="p-3 text-sm text-slate-500">Recherche...</p>
                    ) : patientsResults.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500">Aucun patient</p>
                    ) : (
                      patientsResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                          onClick={() => setSelectedPatient(p)}
                        >
                          <span className="text-sm font-medium text-slate-800">
                            {p.prenom} {p.nom}
                          </span>
                          <Check className="h-4 w-4 text-slate-400" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="heure">Heure</Label>
                <Input
                  id="heure"
                  type="time"
                  value={form.heure}
                  onChange={(e) => setForm((prev) => ({ ...prev, heure: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="duree">Durée</Label>
              <select
                id="duree"
                value={form.duree}
                onChange={(e) => setForm((prev) => ({ ...prev, duree: e.target.value }))}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </div>

            <div>
              <Label htmlFor="motif">Motif</Label>
              <Input
                id="motif"
                value={form.motif}
                onChange={(e) => setForm((prev) => ({ ...prev, motif: e.target.value }))}
                placeholder="Ex: Détartrage, Consultation..."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes optionnelles..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenModal(false)}>
                Annuler
              </Button>
              <Button onClick={() => void createRdv()} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
