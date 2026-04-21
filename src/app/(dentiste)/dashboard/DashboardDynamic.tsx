"use client"

import dynamic from "next/dynamic"

const DashboardPageClient = dynamic(() => import("./DashboardPageClient"), {
  ssr: false,
  loading: () => (
    <div className="space-y-6 animate-pulse">
      <div className="h-44 rounded-3xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  ),
})

export default function DashboardDynamic() {
  return <DashboardPageClient />
}
