import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoneyTND } from "@/lib/format"
import { actesMock } from "@/lib/mock-data"

export default function PaiementsPage() {
  const total = actesMock.reduce((sum, acte) => sum + acte.montant_total, 0)
  const paye = actesMock.reduce((sum, acte) => sum + acte.montant_paye, 0)

  return (
    <Card className="dentiste-surface rounded-2xl border">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-gray-100">Suivi Paiements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-slate-700 dark:text-gray-200">
        <p>Total soins: {formatMoneyTND(total)}</p>
        <p>Montant payé: {formatMoneyTND(paye)}</p>
        <p>Restant: {formatMoneyTND(total - paye)}</p>
      </CardContent>
    </Card>
  )
}
