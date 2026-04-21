import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

/** Si la colonne n’existe pas encore en base, met à jour sans elle (migration : 08_patients_mot_de_passe_temp.sql). */
function isMissingMotDePasseTempColumn(error: { message?: string; code?: string } | null) {
  if (!error) return false
  const msg = (error.message ?? "").toLowerCase()
  return (
    msg.includes("mot_de_passe_temp") ||
    msg.includes("schema cache") ||
    error.code === "PGRST204"
  )
}

async function updatePatientAfterAuth(
  supabaseAdmin: SupabaseClient,
  patientId: string,
  payload: {
    auth_user_id: string
    email: string
    mot_de_passe_temp: string
  },
) {
  const base = {
    auth_user_id: payload.auth_user_id,
    email: payload.email,
    email_confirmed: true as const,
  }
  const patchWithTemp = {
    ...base,
    mot_de_passe_temp: payload.mot_de_passe_temp,
  }

  const { error: errFull } = await supabaseAdmin
    .from("patients")
    // Types DB locaux sans mot_de_passe_temp — colonne ajoutée par migration SQL
    .update(patchWithTemp as never)
    .eq("id", patientId)

  if (!errFull) return { error: null as null }

  if (isMissingMotDePasseTempColumn(errFull)) {
    console.warn(
      "[create-patient-account] Colonne mot_de_passe_temp absente — exécutez supabase/sql/08_patients_mot_de_passe_temp.sql dans Supabase SQL Editor.",
    )
    const { error: errBase } = await supabaseAdmin
      .from("patients")
      .update(base as never)
      .eq("id", patientId)
    return { error: errBase }
  }

  return { error: errFull }
}

export async function POST(request: Request) {
  try {
    const { email, password, patientId } = await request.json()

    if (!email || !password || !patientId) {
      return NextResponse.json(
        { error: "Email, mot de passe et patientId requis" },
        { status: 400 },
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl) {
      console.error("[create-patient-account] NEXT_PUBLIC_SUPABASE_URL manquant")
      return NextResponse.json(
        {
          error:
            "Configuration serveur : définissez NEXT_PUBLIC_SUPABASE_URL dans .env.local",
        },
        { status: 500 },
      )
    }

    if (!serviceRoleKey) {
      console.error(
        "[create-patient-account] SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local",
      )
      return NextResponse.json(
        {
          error:
            "Clé manquante : ajoutez SUPABASE_SERVICE_ROLE_KEY (service role) dans .env.local — voir Supabase → Project Settings → API",
        },
        { status: 500 },
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const emailNorm = String(email).trim().toLowerCase()
    if (!emailNorm.includes("@")) {
      return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 })
    }

    let existingUser:
      | { id: string; email?: string | undefined }
      | undefined

    let page = 1
    const perPage = 1000
    while (page <= 20) {
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      })
      if (listErr) {
        console.error("[create-patient-account] listUsers:", listErr)
        return NextResponse.json({ error: listErr.message }, { status: 400 })
      }
      existingUser = listData?.users?.find(
        (u) => u.email?.trim().toLowerCase() === emailNorm,
      )
      if (existingUser) break
      if (!listData?.users?.length || listData.users.length < perPage) break
      page++
    }

    if (existingUser) {
      const { data: conflict } = await supabaseAdmin
        .from("patients")
        .select("id")
        .eq("auth_user_id", existingUser.id)
        .neq("id", patientId)
        .maybeSingle()

      if (conflict) {
        return NextResponse.json(
          {
            error:
              "Ce compte est déjà lié à un autre patient. Utilisez un autre email ou contactez le support.",
          },
          { status: 400 },
        )
      }

      const { error: updateError } = await updatePatientAfterAuth(supabaseAdmin, patientId, {
        auth_user_id: existingUser.id,
        email: emailNorm,
        mot_de_passe_temp: password,
      })

      if (updateError) {
        console.error("Update error (compte existant):", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: "Compte existant lié au patient avec succès",
      })
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: emailNorm,
        password,
        email_confirm: true,
        user_metadata: { role: "patient" },
      })

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: updateError } = await updatePatientAfterAuth(supabaseAdmin, patientId, {
      auth_user_id: authData.user!.id,
      email: emailNorm,
      mot_de_passe_temp: password,
    })

    if (updateError) {
      console.error("Update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Compte patient créé avec succès",
    })
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Erreur inattendue" },
      { status: 500 },
    )
  }
}
