/** Mot de passe temporaire « Prenom2024! » (ex. Nada2024!) pour l’espace patient. */
export function generateTempPassword(prenom: string) {
  const letters = prenom.replace(/[^a-zA-ZÀ-ÿ]/gi, "")
  const base =
    letters.length > 0
      ? letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase()
      : "Patient"
  return `${base}2024!`
}
