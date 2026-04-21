import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (!url || !key) {
      return res
    }

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value)
          })
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    })

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const pathname = req.nextUrl.pathname

    // Routes publiques - laisser passer
    if (
      pathname === "/login" ||
      pathname === "/patient/login" ||
      pathname === "/" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/static") ||
      pathname.includes(".")
    ) {
      return res
    }

    // Pas de session → redirect login
    if (!session) {
      if (pathname.startsWith("/patient")) {
        return NextResponse.redirect(new URL("/patient/login", req.url))
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const role = session.user.user_metadata?.role

    // Patient sur routes dentiste → redirect patient
    if (
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/patients") ||
        pathname.startsWith("/rendez-vous")) &&
      role === "patient"
    ) {
      return NextResponse.redirect(new URL("/patient/dashboard", req.url))
    }

    // Dentiste sur routes patient → redirect dashboard
    if (
      pathname.startsWith("/patient/") &&
      pathname !== "/patient/login" &&
      role === "dentiste"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    return res
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)"],
}
