'use server'

import { redirect } from 'next/navigation'
import { getVehicleByPlate } from '@/lib/services/vehicle'
import { getCertificateByCorrelative } from '@/lib/services/certificate'

export type SearchState = {
  error?: string
  query?: string
}

export async function searchAction(
  _prev: SearchState | null,
  formData: FormData,
): Promise<SearchState> {
  const query = (formData.get('query') as string ?? '').trim().toUpperCase()

  if (!query) {
    return { error: 'Ingrese una placa o número correlativo para consultar' }
  }

  if (query.length < 2) {
    return { error: 'Debe tener al menos 2 caracteres' }
  }

  // 1. Try plate first
  const vehicle = await getVehicleByPlate(query)
  if (vehicle) {
    redirect(`/consulta/${encodeURIComponent(query)}`)
  }

  // 2. Try correlative
  const result = await getCertificateByCorrelative(query)
  if (result) {
    redirect(`/consulta/correlativo/${encodeURIComponent(query)}`)
  }

  // 3. Not found
  return {
    error: `No se encontraron resultados para "${query}"`,
    query,
  }
}
