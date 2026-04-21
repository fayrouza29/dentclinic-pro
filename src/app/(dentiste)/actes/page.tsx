import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoneyTND } from "@/lib/format"
import { actesMock } from "@/lib/mock-data"

export default function ActesPage() {
  return (
    <Card className="dentiste-surface rounded-2xl border">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-gray-100">Actes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-slate-700 dark:text-gray-200">
        {actesMock.map((acte) => (
          <p key={acte.id}>{acte.type_acte} - {formatMoneyTND(acte.montant_total)}</p>
        ))}
      </CardContent>
    </Card>
  )
}
