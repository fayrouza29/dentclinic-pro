import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generateTempPassword } from "@/lib/patient-password"

function isMissingMotDePasseTempColumn(error: { message?: string; code?: string } | null) {
  if (!error) return false
  const msg = (error.message ?? "").toLowerCase()
  return (
    msg.includes("mot_de_passe_temp") ||
    msg.includes("schema cache") ||
    error.code === "PGRST204"
  )
}

export async function POST(request: Request) {
  try {
    const { patientId } = await request.json()

    if (!patientId) {
      return NextResponse.json({ error: "patientId requis" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Configuration serveur : NEXT_PUBLIC_SUPABASE_URL manquant" },
        { status: 500 },
      )
    }
    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local (Project Settings → API)",
        },
        { status: 500 },
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("patients")
      .select("id, auth_user_id, prenom")
      .eq("id", patientId)
      .single()

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Patient introuvable" }, { status: 404 })
    }

    if (!row.auth_user_id) {
      return NextResponse.json({ error: "Aucun compte mobile lié à ce patient" }, { status: 400 })
    }

    const newPassword = generateTempPassword(String(row.prenom ?? "Patient"))

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(row.auth_user_id, {
      password: newPassword,
    })
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 })
    }

    const patchWithTemp = { mot_de_passe_temp: newPassword }
    const { error: updErr } = await supabaseAdmin
      .from("patients")
      .update(patchWithTemp as never)
      .eq("id", patientId)

    if (updErr) {
      if (isMissingMotDePasseTempColumn(updErr)) {
        console.warn(
          "[reset-patient-password] Colonne mot_de_passe_temp absente — exécutez la migration SQL dans Supabase.",
        )
      } else {
        return NextResponse.json({ error: updErr.message }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true, password: newPassword })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inattendue"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
