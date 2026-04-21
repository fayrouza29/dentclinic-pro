import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** Interface dentiste (PC) : tout le back-office. */
const dentistPrefixes = ["/dashboard", "/patients", "/actes", "/paiements", "/rendez-vous"]

function isDentistRoute(pathname: string) {
  return dentistPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Espace patient mobile (hors /patient/login). */
function isPatientAppRoute(pathname: string) {
  if (pathname === "/patient/login") return false
  return pathname === "/patient" || pathname.startsWith("/patient/")
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !key) {
    if (isDentistRoute(request.nextUrl.pathname)) {
      const login = new URL("/login", request.url)
      login.searchParams.set("error", "config")
      return NextResponse.redirect(login)
    }
    return supabaseResponse
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const role = user?.user_metadata?.role as string | undefined

  // Dentiste → /login si non connecté ; un compte patient ne doit pas utiliser le back-office
  if (isDentistRoute(pathname)) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(redirectUrl)
    }
    if (role === "patient") {
      return NextResponse.redirect(new URL("/patient/dashboard", request.url))
    }
  }

  // Patient → /patient/login si non connecté ; dentiste (ou autre rôle) → espace dentiste
  if (isPatientAppRoute(pathname)) {
    if (!user) {
      const login = new URL("/patient/login", request.url)
      login.searchParams.set("next", pathname)
      return NextResponse.redirect(login)
    }
    if (role !== "patient") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
