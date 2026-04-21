"use client"

import dynamic from "next/dynamic"

const PatientDetailPageClient = dynamic(() => import("./PatientDetailPageClient"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-2xl bg-slate-200" />,
})

export default function PatientDetailDynamic() {
  return <PatientDetailPageClient />
}
