/**
 * Generate a unique correlative number in format CERT-YYYY-NNNN.
 * Pure function — caller must provide the current max sequence for the year.
 */
export function generateCorrelative(year: number, currentMax: number): string {
  const next = currentMax + 1
  const padded = String(next).padStart(4, '0')
  return `CERT-${year}-${padded}`
}
