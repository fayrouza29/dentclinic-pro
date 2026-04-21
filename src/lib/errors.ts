/** Message lisible pour erreurs API / Supabase (PostgrestError n’est pas toujours une `Error`). */
export function getErrorMessage(error: unknown, fallback = "Une erreur est survenue.") {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error !== null && "message" in error) {
    const m = (error as { message: unknown }).message
    if (typeof m === "string" && m.length > 0) return m
  }
  return fallback
}
