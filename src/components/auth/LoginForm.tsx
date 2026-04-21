"use client"

import type { AuthError } from "@supabase/supabase-js"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Lock, Mail } from "lucide-react"
import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CABINET } from "@/lib/cabinet"
import { supabase } from "@/lib/supabase"

function messageConnexion(err: AuthError): string {
  const raw = (err.message ?? "").toLowerCase()
  const code = err.code ?? ""

  if (
    code === "invalid_credentials" ||
    raw.includes("invalid login credentials") ||
    raw.includes("invalid email or password")
  ) {
    return "Email ou mot de passe incorrect."
  }
  if (raw.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Vous devez confirmer votre email avant de vous connecter. Vérifiez votre boîte mail, ou désactivez « Confirm email » dans Supabase Auth si vous êtes en développement."
  }
  if (raw.includes("too many requests") || code === "over_request_rate_limit") {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer."
  }
  if (raw.includes("invalid email")) {
    return "L’adresse email n’est pas valide."
  }
  if (raw.includes("user banned") || raw.includes("banned")) {
    return "Ce compte a été désactivé. Contactez l’administrateur."
  }
  if (
    raw.includes("failed to fetch") ||
    raw.includes("networkerror") ||
    raw.includes("load failed") ||
    raw.includes("network request failed")
  ) {
    return "Le navigateur n’a pas pu contacter Supabase (erreur réseau). Vérifiez l’URL du projet, que le projet n’est pas en pause, votre connexion, et désactivez temporairement les bloqueurs de pubs / VPN. Si vous aviez activé une PWA avant : F12 → Application → Service Workers → Unregister, puis rechargez la page."
  }
  return "Connexion impossible. Vérifiez l’email, le mot de passe et la configuration du projet Supabase."
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") ?? "/dashboard"

  const [pingOk, setPingOk] = useState(false)
  const [pingError, setPingError] = useState<string | null>(null)
  const [pingDone, setPingDone] = useState(false)

  /** Ancien next-pwa pouvait laisser un SW qui casse les fetch vers Supabase. */
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        void r.unregister()
      })
    })
  }, [])

  /** Test API Supabase au chargement (table patients + count). */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { error, count } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })

        if (cancelled) return

        if (error) {
          console.error("[Supabase test]", error)
          const full = [
            error.message,
            error.details && `details: ${error.details}`,
            error.hint && `hint: ${error.hint}`,
            error.code && `code: ${error.code}`,
          ]
            .filter(Boolean)
            .join("\n")
          setPingError(full)
          setPingOk(false)
        } else {
          console.log("Supabase connecté", { count })
          setPingError(null)
          setPingOk(true)
        }
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.stack ?? e.message : String(e)
        console.error("[Supabase test]", e)
        setPingError(msg)
        setPingOk(false)
      } finally {
        if (!cancelled) setPingDone(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setErrorDetail(null)
    setLoading(true)
    try {
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signError) {
        setError(messageConnexion(signError))
        if (process.env.NODE_ENV === "development") {
          setErrorDetail(
            [signError.code, signError.message].filter(Boolean).join(" — ") || null,
          )
        }
        return
      }
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard")
      router.refresh()
    } catch (caught) {
      const m = caught instanceof Error ? caught.message : ""
      if (m.includes("NEXT_PUBLIC_SUPABASE")) {
        setError(m)
      } else if (m.toLowerCase().includes("fetch") || m.toLowerCase().includes("network")) {
        setError(
          "Le navigateur n’a pas pu contacter Supabase. Vérifiez .env.local, le pare-feu, les extensions, et désinscrivez les Service Workers (F12 → Application).",
        )
      } else {
        setError("Impossible de contacter Supabase. Vérifiez votre connexion et les variables .env.local.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-700 via-cyan-600 to-indigo-600" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1200')] bg-cover bg-center opacity-10" />
      <Card className="relative w-full max-w-md rounded-3xl border-0 bg-white/90 shadow-2xl backdrop-blur-xl">
        <CardContent className="space-y-6 p-8">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white">
              <Logo size={34} showText={false} />
            </div>
            <h1 className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-3xl font-bold text-transparent">
              {CABINET.nom}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{CABINET.docteur}</p>
            <p className="text-xs text-slate-400">{CABINET.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.tn"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {error ? (
              <div className="space-y-1 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-center">
                <p className="text-sm font-medium text-red-700">{error}</p>
                {errorDetail ? (
                  <p className="break-words text-xs text-red-600/90" title={errorDetail}>
                    {errorDetail}
                  </p>
                ) : null}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white hover:from-sky-600 hover:to-indigo-600"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>

          {pingDone && pingOk ? (
            <p className="text-center text-sm font-medium text-emerald-700">
              Test API : Supabase connecté (count patients = accès OK ou RLS selon votre config).
            </p>
          ) : null}

          {pingDone && pingError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
                Erreur test Supabase (réponse complète)
              </p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-red-700">
                {pingError}
              </pre>
            </div>
          ) : null}

          {!pingDone ? (
            <p className="text-center text-xs text-slate-500">Test de connexion Supabase en cours…</p>
          ) : null}

          <p className="text-center text-sm text-slate-500">
            Espace patient ? Utilisez votre lien personnel.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
