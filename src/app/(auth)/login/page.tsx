import { Suspense } from "react"
import { LoginForm } from "@/components/auth/LoginForm"
import { LoginGate } from "@/components/auth/LoginGate"

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
      Chargement…
    </div>
  )
}

export default function LoginPage() {
  return (
    <LoginGate>
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </LoginGate>
  )
}
