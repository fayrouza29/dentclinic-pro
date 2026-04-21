/** URL publique du site (ex. https://monsite.vercel.app). Définir NEXT_PUBLIC_SITE_URL en prod. */
export function getPublicOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (raw) return raw.replace(/\/$/, "")
  if (typeof window !== "undefined") return window.location.origin
  return ""
}

export function getPatientLoginUrl(): string {
  const o = getPublicOrigin()
  return o ? `${o}/patient/login` : "/patient/login"
}
