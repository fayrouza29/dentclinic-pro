import { Card, CardContent } from "@/components/ui/card"
import { formatMoneyTND } from "@/lib/format"
import { actesMock, patientsMock, rendezVousMock } from "@/lib/mock-data"

export default function MonEspacePage() {
  const patient = patientsMock[0]
  const nextRdv = rendezVousMock.find((r) => r.patient_id === patient.id)
  const restant = actesMock.filter((a) => a.patient_id === patient.id).reduce((sum, a) => sum + (a.montant_total - a.montant_paye), 0)

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold">Bonjour {patient.prenom} !</h1>
      <Card className="rounded-2xl border-0 bg-gradient-to-r from-sky-500 to-indigo-500 text-white">
        <CardContent className="p-4">
          <p className="text-sm">Prochain rendez-vous</p>
          <p className="text-lg font-semibold">{nextRdv?.motif ?? "Aucun RDV"}</p>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-0 bg-white">
        <CardContent className="p-4">Restant à payer: <span className="font-semibold text-red-500">{formatMoneyTND(restant)}</span></CardContent>
      </Card>
    </div>
  )
}
