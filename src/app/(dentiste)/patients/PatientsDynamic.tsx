"use client"

import dynamic from "next/dynamic"

const PatientsPageClient = dynamic(() => import("./PatientsPageClient"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200" />
      ))}
    </div>
  ),
})

export default function PatientsDynamic() {
  return <PatientsPageClient />
}
