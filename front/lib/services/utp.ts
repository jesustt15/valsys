import { db } from '@/lib/db'
import { inspections, vehicles, users, owners, inspectionAnswers, inspectionAttachments, signatures, certificates, gncCylinders } from '@/db/schema'
import { eq, and, inArray, asc } from 'drizzle-orm'

export interface UtpInspectionRow {
  id: string
  inspectionDate: Date | null
  licensePlate: string | null
  ownerName: string | null
  status: string
  correlativeNumber: string | null
  operatorName: string | null
}

/**
 * Get all UTP inspections (source = 'utp'), optionally filtered by status.
 */
export async function getUtpInspections(status?: string): Promise<UtpInspectionRow[]> {
  const conditions = [eq(inspections.source, 'utp')]
  if (status) {
    conditions.push(eq(inspections.status, status as any))
  }

  const records = await db
    .select({
      id: inspections.id,
      inspectionDate: inspections.inspectionDate,
      vehicleId: inspections.vehicleId,
      operatorId: inspections.operatorId,
      status: inspections.status,
      correlativeNumber: certificates.correlativeNumber,
    })
    .from(inspections)
    .leftJoin(certificates, eq(certificates.inspectionId, inspections.id))
    .where(and(...conditions))
    .orderBy(inspections.inspectionDate)

  if (records.length === 0) return []

  // Fetch related vehicles
  const vehicleIds = [...new Set(records.map((r) => r.vehicleId).filter(Boolean))] as string[]
  const vehicleLookup = new Map<string, { licensePlate: string | null; ownerId: string | null }>()
  if (vehicleIds.length > 0) {
    const v = await db
      .select({ id: vehicles.id, licensePlate: vehicles.licensePlate, ownerId: vehicles.ownerId })
      .from(vehicles)
      .where(inArray(vehicles.id, vehicleIds))
    for (const row of v) vehicleLookup.set(row.id, row)
  }

  // Fetch related operators
  const operatorIds = [...new Set(records.map((r) => r.operatorId).filter(Boolean))] as string[]
  const operatorMap = new Map<string, string>()
  if (operatorIds.length > 0) {
    const u = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(inArray(users.id, operatorIds))
    for (const row of u) operatorMap.set(row.id, row.fullName)
  }

  // Fetch owners for all vehicles
  const ownerIds = [...new Set(
    [...vehicleLookup.values()].map(v => v.ownerId).filter(Boolean)
  )] as string[]
  const ownerMap = new Map<string, string>()
  if (ownerIds.length > 0) {
    const o = await db
      .select({ id: owners.id, fullName: owners.fullName })
      .from(owners)
      .where(inArray(owners.id, ownerIds))
    for (const row of o) ownerMap.set(row.id, row.fullName)
  }

  return records.map((r) => {
    const vehicle = r.vehicleId ? vehicleLookup.get(r.vehicleId) : null
    const ownerName = vehicle?.ownerId ? ownerMap.get(vehicle.ownerId) ?? null : null
    return {
      id: r.id,
      inspectionDate: r.inspectionDate,
      licensePlate: vehicle?.licensePlate ?? null,
      ownerName,
      status: r.status ?? 'inspeccion_inicial',
      correlativeNumber: r.correlativeNumber ?? null,
      operatorName: r.operatorId ? operatorMap.get(r.operatorId) ?? null : null,
    }
  })
}

/**
 * Get full UTP inspection detail by ID.
 */
export async function getUtpInspectionById(id: string) {
  const [inspection] = await db
    .select()
    .from(inspections)
    .where(and(eq(inspections.id, id), eq(inspections.source, 'utp')))

  if (!inspection) return null

  const [vehicle] = inspection.vehicleId
    ? await db.select().from(vehicles).where(eq(vehicles.id, inspection.vehicleId))
    : [null]

  const [owner] = vehicle?.ownerId
    ? await db.select().from(owners).where(eq(owners.id, vehicle.ownerId))
    : [null]

  const answers = await db
    .select()
    .from(inspectionAnswers)
    .where(eq(inspectionAnswers.inspectionId, id))
    .orderBy(asc(inspectionAnswers.createdAt))

  const attachments = await db
    .select()
    .from(inspectionAttachments)
    .where(eq(inspectionAttachments.inspectionId, id))

  const [signature] = inspection.ownerSignatureId
    ? await db.select().from(signatures).where(eq(signatures.id, inspection.ownerSignatureId))
    : [null]

  const [certificate] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.inspectionId, id))

  const cylinders = vehicle
    ? await db.select().from(gncCylinders).where(eq(gncCylinders.vehicleId, vehicle.id))
    : []

  return {
    ...inspection,
    vehicle,
    owner,
    answers,
    attachments,
    signature,
    certificate,
    cylinders,
  }
}

export interface UtpGateResult {
  canIssue: boolean
  missing: string[]
}

/**
 * Gate check: can a UTP certificate be issued?
 * Requirements: no false/null answers AND signature present.
 */
export async function canIssueUtpCertificate(inspectionId: string): Promise<UtpGateResult> {
  const missing: string[] = []

  const [inspection] = await db
    .select()
    .from(inspections)
    .where(and(eq(inspections.id, inspectionId), eq(inspections.source, 'utp')))
    .limit(1)

  if (!inspection) {
    return { canIssue: false, missing: ['inspection_not_found'] }
  }

  // Check checklist answers — all must be true (not false, not null)
  const answers = await db
    .select()
    .from(inspectionAnswers)
    .where(eq(inspectionAnswers.inspectionId, inspectionId))

  const nonCompliant = answers.filter((a) => a.answer === false || a.answer === null)
  if (nonCompliant.length > 0) {
    missing.push('non_compliant_answers')
  }

  // Check signature
  if (!inspection.ownerSignatureId) {
    missing.push('signature_required')
  }

  return {
    canIssue: missing.length === 0,
    missing,
  }
}
