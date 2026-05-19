import { db } from '@/lib/db'
import { inspections, vehicles, users } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'

export interface InspectionSummary {
  id: string
  inspectionDate: Date | null
  licensePlate: string | null
  brand: string | null
  model: string | null
  status: string
  kmCurrent: number
  operatorName: string | null
}

export async function getAllInspections(): Promise<InspectionSummary[]> {
  const records = await db
    .select({
      id: inspections.id,
      inspectionDate: inspections.inspectionDate,
      vehicleId: inspections.vehicleId,
      operatorId: inspections.operatorId,
      status: inspections.status,
      kmCurrent: inspections.kmCurrent,
    })
    .from(inspections)
    .orderBy(inspections.inspectionDate)

  if (records.length === 0) return []

  // Fetch related vehicles
  const vehicleIds = [...new Set(records.map((r) => r.vehicleId).filter(Boolean))]
  const vehicleMap = new Map<string, { licensePlate: string | null; brand: string | null; model: string | null }>()
  if (vehicleIds.length > 0) {
    const v = await db
      .select({
        id: vehicles.id,
        licensePlate: vehicles.licensePlate,
        brand: vehicles.brand,
        model: vehicles.model,
      })
      .from(vehicles)
      .where(inArray(vehicles.id, vehicleIds as string[]))
    for (const row of v) vehicleMap.set(row.id, row)
  }

  // Fetch related operators
  const operatorIds = [...new Set(records.map((r) => r.operatorId).filter(Boolean))]
  const operatorMap = new Map<string, { fullName: string }>()
  if (operatorIds.length > 0) {
    const u = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(inArray(users.id, operatorIds as string[]))
    for (const row of u) operatorMap.set(row.id, row)
  }

  return records.map((r) => ({
    id: r.id,
    inspectionDate: r.inspectionDate,
    licensePlate: r.vehicleId ? vehicleMap.get(r.vehicleId)?.licensePlate ?? null : null,
    brand: r.vehicleId ? vehicleMap.get(r.vehicleId)?.brand ?? null : null,
    model: r.vehicleId ? vehicleMap.get(r.vehicleId)?.model ?? null : null,
    status: r.status ?? 'inspeccion_inicial',
    kmCurrent: r.kmCurrent,
    operatorName: r.operatorId ? operatorMap.get(r.operatorId)?.fullName ?? null : null,
  }))
}
