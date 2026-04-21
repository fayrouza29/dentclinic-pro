import { Acte, Patient, RendezVous } from "@/lib/types"

export const patientsMock: Patient[] = [
  { id: "p1", nom: "Ben Salem", prenom: "Amina", telephone: "+216 98 456 212", telephone_whatsapp: "+21698456212", email: "amina@mail.tn", ville: "Tunis", allergies: "Aucune", actif: true },
  { id: "p2", nom: "Trabelsi", prenom: "Youssef", telephone: "+216 21 123 456", email: "youssef@mail.tn", ville: "Sfax", allergies: "Pénicilline", actif: true },
  { id: "p3", nom: "Haddad", prenom: "Lina", telephone: "+216 55 887 001", email: "lina@mail.tn", ville: "Ariana", actif: true },
]

export const rendezVousMock: RendezVous[] = [
  { id: "r1", patient_id: "p1", date_rdv: new Date().toISOString(), motif: "Contrôle annuel", statut: "confirme" },
  { id: "r2", patient_id: "p2", date_rdv: new Date(Date.now() + 7200000).toISOString(), motif: "Détartrage", statut: "planifie" },
]

export const actesMock: Acte[] = [
  { id: "a1", patient_id: "p1", date_acte: "2026-04-10", type_acte: "Implant", dent_numero: "36", montant_total: 1200, montant_paye: 800 },
  { id: "a2", patient_id: "p2", date_acte: "2026-04-14", type_acte: "Détartrage", dent_numero: "ALL", montant_total: 180, montant_paye: 180 },
  { id: "a3", patient_id: "p3", date_acte: "2026-04-16", type_acte: "Composite", dent_numero: "11", montant_total: 220, montant_paye: 0 },
]
