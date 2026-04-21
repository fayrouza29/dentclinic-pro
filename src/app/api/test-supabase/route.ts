import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.from("patients").select("*").limit(1)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          hint: "Souvent : RLS (connectez-vous) ou table absente / nom incorrect.",
        },
        { status: 200 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
