export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return '—'
  const m = value.match(/^(\d{4})-(\d{2})/)
  return m ? `${m[2]}/${m[1]}` : value
}
