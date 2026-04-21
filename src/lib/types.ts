export interface Patient {
  id: string
  nom: string
  prenom: string
  telephone: string
  telephone_whatsapp?: string
  email?: string
  ville?: string
  allergies?: string
  actif: boolean
}

export interface RendezVous {
  id: string
  patient_id: string
  date_rdv: string
  motif: string
  statut: "planifie" | "confirme" | "termine" | "annule" | "absent"
}

export interface Acte {
  id: string
  patient_id: string
  date_acte: string
  type_acte: string
  dent_numero?: string
  montant_total: number
  montant_paye: number
}
