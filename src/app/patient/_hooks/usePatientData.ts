/**
 * @deprecated Utilisez `usePatientRealtime` depuis `../_components/PatientRealtimeContext`.
 * Conservé pour compatibilité des imports.
 */
export type {
  PatientActe,
  PatientPaiement,
  PatientProfile,
  PatientRdv,
} from "@/hooks/useRealtimePatient"
export { usePatientRealtime as usePatientData } from "../_components/PatientRealtimeContext"
