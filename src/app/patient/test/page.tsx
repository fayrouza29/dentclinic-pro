"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type TestResult = {
  userId?: string
  userEmail?: string | null
  roleFromMetadata?: string | null
  parAuthUserId?: unknown
  parEmail?: unknown
}

export default function PatientSupabaseTestPage() {
  const [result, setResult] = useState<TestResult>({})

  useEffect(() => {
    async function test() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const roleFromMetadata =
        (user?.user_metadata as { role?: string } | undefined)?.role ?? null

      const { data: p1 } = await supabase
        .from("patients")
        .select("id, nom, email, auth_user_id")
        .eq("auth_user_id", user?.id ?? "")
        .maybeSingle()

      const { data: p2 } = await supabase
        .from("patients")
        .select("id, nom, email, auth_user_id")
        .eq("email", user?.email ?? "")
        .maybeSingle()

      setResult({
        userId: user?.id,
        userEmail: user?.email,
        roleFromMetadata,
        parAuthUserId: p1,
        parEmail: p2,
      })
    }
    void test()
  }, [])

  const isPatientRole = result.roleFromMetadata === "patient"
  const bothNull = result.parAuthUserId == null && result.parEmail == null

  return (
    <div className="space-y-4 p-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Interprétation</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900">
          <li>
            La table <code className="rounded bg-amber-100 px-1">patients</code> ne contient une fiche que pour les{" "}
            <strong>comptes patients</strong> (créés par le cabinet), pas pour le compte dentiste.
          </li>
          <li>
            Si <code className="rounded bg-amber-100 px-1">userEmail</code> est celui du dentiste,{" "}
            <code className="rounded bg-amber-100 px-1">parAuthUserId</code> et{" "}
            <code className="rounded bg-amber-100 px-1">parEmail</code> à <strong>null</strong> est{" "}
            <strong>normal</strong>.
          </li>
          <li>
            Pour tester la fiche de Fayrouz : déconnexion, puis connexion sur{" "}
            <strong>/patient/login</strong> avec <strong>fayrouz.haddad@isimg.tn</strong> (compte patient).
          </li>
        </ul>
        {bothNull && result.userEmail && !isPatientRole ? (
          <p className="mt-3 font-medium text-amber-950">
            Compte actuel : probablement <strong>cabinet / dentiste</strong> (rôle metadata :{" "}
            {result.roleFromMetadata ?? "non défini"}). Ce n’est pas le compte patient.
          </p>
        ) : null}
      </div>
      <pre className="overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-[12px] leading-relaxed text-slate-800">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}
