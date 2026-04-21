"use client"

import { Suspense, useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Logo } from "@/components/Logo"
import { CABINET } from "@/lib/cabinet"
import { supabase } from "@/lib/supabase"

function PatientLoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") ?? "/patient/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    })

    if (authError) {
      setError("Email ou mot de passe incorrect")
      setLoading(false)
      return
    }

    const target =
      nextPath.startsWith("/patient") && nextPath !== "/patient/login"
        ? nextPath
        : "/patient/dashboard"
    router.replace(target)
  }

  return (
    <div className="flex min-h-[100vh] min-h-[100dvh] flex-col bg-gradient-to-b from-blue-600 to-blue-800 dark:from-gray-900 dark:to-gray-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute left-10 top-20 h-16 w-16 rounded-full bg-white/15 animate-pulse" />
        <span className="absolute right-12 top-36 h-10 w-10 rounded-full bg-white/20 animate-pulse" />
        <span className="absolute bottom-32 left-20 h-14 w-14 rounded-full bg-white/15 animate-pulse" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="animate-bounce">
            <Logo size={82} showText={false} />
          </div>
          <p className="mt-3 text-sm font-normal text-white">{CABINET.nom}</p>
          <p className="mt-1 text-xl font-bold text-white">{CABINET.slogan}</p>
        </header>

        <div className="w-full max-w-[400px] rounded-3xl bg-white p-8 shadow-2xl dark:bg-gray-800">
          <h1 className="mb-1 text-center text-2xl font-bold text-gray-800 dark:text-white">Mon Espace Patient</h1>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">{CABINET.nom}</p>
          <p className="mb-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Connectez-vous avec vos identifiants
          </p>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                htmlFor="patient-email"
              >
                Email
              </label>
              <input
                id="patient-email"
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-blue-900"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                htmlFor="patient-password"
              >
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="patient-password"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-4 pr-12 text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-blue-900"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-gray-500 dark:text-gray-400"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Connexion"
              )}
            </button>
          </form>
        </div>

        <footer className="mt-8 max-w-sm px-2 text-center text-xs leading-relaxed text-white/90">
          <p>Vos identifiants vous ont été fournis par votre dentiste</p>
          <p className="mt-1 text-white/75">Un problème ? Contactez votre cabinet.</p>
        </footer>
      </div>
    </div>
  )
}

export default function PatientLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100vh] min-h-[100dvh] items-center justify-center bg-gradient-to-b from-blue-500 to-cyan-400 text-sm text-white/90">
          Chargement...
        </div>
      }
    >
      <PatientLoginInner />
    </Suspense>
  )
}
