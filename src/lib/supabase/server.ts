import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

function getEnvOrThrow() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) {
    throw new Error(
      "Variables manquantes : définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local",
    )
  }
  return { url, key }
}

/** Client Supabase côté serveur (RSC, Route Handlers, Server Actions). */
export async function createSupabaseServerClient() {
  const { url, key } = getEnvOrThrow()
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Peut échouer dans un Server Component ; le middleware rafraîchit la session.
        }
      },
    },
  })
}
