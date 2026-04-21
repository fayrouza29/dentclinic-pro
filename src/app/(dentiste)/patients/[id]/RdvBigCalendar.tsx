"use client"

import { useEffect, useMemo } from "react"
import { Calendar, dateFnsLocalizer } from "react-big-calendar"
import { format, getDay, parse, startOfWeek } from "date-fns"
import { fr } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { supabase } from "@/lib/supabase"

const locales = { fr }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export type RdvCalendarRow = {
  id: string
  date_rdv: string
  motif: string | null
  statut: string
  notes: string | null
  duree_minutes?: number | null
}

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: RdvCalendarRow
}

function eventStyleGetter(event: CalendarEvent) {
  const colors: Record<string, string> = {
    planifie: "#3B82F6",
    confirme: "#06B6D4",
    termine: "#10B981",
    annule: "#EF4444",
    absent: "#F59E0B",
  }
  const statut = event.resource.statut
  return {
    style: {
      backgroundColor: colors[statut] || "#3B82F6",
      borderRadius: "6px",
      border: "none",
      color: "white",
      fontSize: "12px",
    },
  }
}

const calendarMessages = {
  date: "Date",
  time: "Heure",
  event: "Rendez-vous",
  allDay: "Journée",
  week: "Semaine",
  work_week: "Semaine de travail",
  day: "Jour",
  month: "Mois",
  previous: "Précédent",
  next: "Suivant",
  yesterday: "Hier",
  tomorrow: "Demain",
  today: "Aujourd'hui",
  agenda: "Agenda",
  showMore: (n: number) => `+${n} de plus`,
  noEventsInRange: "Aucun rendez-vous sur cette période.",
}

export function RdvBigCalendar({
  patientId,
  rdvs,
  onRefresh,
  onSelectEvent,
}: {
  patientId: string
  rdvs: RdvCalendarRow[]
  onRefresh: () => void | Promise<void>
  onSelectEvent: (rdv: RdvCalendarRow) => void
}) {
  const events = useMemo(() => {
    return rdvs.map((r) => {
      const start = new Date(r.date_rdv)
      const duree = r.duree_minutes ?? 30
      const end = new Date(start.getTime() + duree * 60_000)
      return {
        id: r.id,
        title: r.motif || "Rendez-vous",
        start,
        end,
        resource: r,
      } as CalendarEvent
    })
  }, [rdvs])

  useEffect(() => {
    if (!patientId) return
    const channel = supabase
      .channel(`rdv-realtime-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rendez_vous",
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          void onRefresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [patientId, onRefresh])

  return (
    <div className="space-y-4">
      <div className="h-[560px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Calendar
          culture="fr"
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          defaultView="month"
          views={["month", "week", "day", "agenda"]}
          messages={calendarMessages}
          eventPropGetter={(e) => eventStyleGetter(e as CalendarEvent)}
          onSelectEvent={(e) => onSelectEvent((e as CalendarEvent).resource)}
        />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#3B82F6" }} />
          Planifié
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#06B6D4" }} />
          Confirmé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#10B981" }} />
          Terminé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#EF4444" }} />
          Annulé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />
          Absent
        </span>
      </div>
    </div>
  )
}
