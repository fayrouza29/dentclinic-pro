"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, FileText, Home, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/patient/dashboard", label: "Accueil", icon: Home },
  { href: "/patient/rendez-vous", label: "Mes RDV", icon: CalendarDays },
  { href: "/patient/soins", label: "Mes Soins", icon: FileText },
  { href: "/patient/compte", label: "Mon Compte", icon: UserRound },
]

function isActive(pathname: string, href: string) {
  if (href === "/patient/dashboard") {
    return pathname === "/patient/dashboard" || pathname === "/patient"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PatientBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--patient-border)] bg-[var(--patient-nav-bg)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 min-h-[64px] w-full max-w-[430px] items-center px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-all",
                active
                  ? "text-blue-500 motion-safe:animate-bounce"
                  : "text-[var(--patient-text2)]",
              )}
            >
              <Icon className="h-6 w-6 shrink-0" />
              <span className="text-center leading-tight">{label}</span>
              {active ? <span className="h-1 w-1 rounded-full bg-blue-500" /> : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
