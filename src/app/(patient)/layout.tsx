import Link from "next/link"

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-20 md:hidden">
      {children}
      <nav className="fixed inset-x-0 bottom-0 flex border-t bg-white p-2">
        <Link href="/mon-espace" className="flex-1 text-center text-sm text-sky-600">Accueil</Link>
        <Link href="/mon-espace?tab=rdv" className="flex-1 text-center text-sm text-slate-500">Mes RDV</Link>
        <Link href="/mon-espace?tab=soins" className="flex-1 text-center text-sm text-slate-500">Mes soins</Link>
      </nav>
    </div>
  )
}
