import type { PostgrestError } from "@supabase/supabase-js"

export function logPatientInsertError(error: PostgrestError) {
  console.error("Erreur Supabase:", error)
  console.error("Code:", error.code)
  console.error("Message:", error.message)
  console.error("Details:", error.details)
  console.error("Hint:", error.hint)
}

export type PatientFormForInsert = {
  prenom: string
  nom: string
  date_naissance: string
  telephone: string
  telephone_whatsapp: string
  email: string
  adresse: string
  ville: string
  sexe: string
  groupe_sanguin: string
  allergies: string
  antecedents_medicaux: string
  antecedents_dentaires: string
  notes_generales: string
}

/** Payload aligné sur l’INSERT attendu (colonnes métier uniquement). */
export function buildPatientInsertPayload(form: PatientFormForInsert) {
  const emailTrim = form.email?.trim()
  return {
    prenom: form.prenom.trim(),
    nom: form.nom.trim(),
    date_naissance: form.date_naissance?.trim() || null,
    sexe: form.sexe?.trim() || null,
    groupe_sanguin: form.groupe_sanguin?.trim() || null,
    telephone: form.telephone.trim(),
    telephone_whatsapp: form.telephone_whatsapp?.trim() || null,
    email: emailTrim ? emailTrim.toLowerCase() : null,
    adresse: form.adresse?.trim() || null,
    ville: form.ville?.trim() || null,
    allergies: form.allergies?.trim() || null,
    antecedents_medicaux: form.antecedents_medicaux?.trim() || null,
    antecedents_dentaires: form.antecedents_dentaires?.trim() || null,
    notes_generales: form.notes_generales?.trim() || null,
    actif: true as const,
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidOptionalEmail(email: string) {
  const t = email.trim()
  if (!t) return true
  return EMAIL_RE.test(t)
}
