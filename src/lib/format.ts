export function formatDateTN(value: string | Date) {
  return new Date(value).toLocaleDateString("fr-TN")
}

/** Date longue en français (ex. lundi 20 avril 2026) */
export function formatDateFrLong(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatMoneyTND(value: number) {
  return `${value.toFixed(3)} TND`
}
