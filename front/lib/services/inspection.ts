import { db } from '@/lib/db'
import { inspections, vehicles, users, owners, inspectionAnswers, inspectionAttachments, signatures, certificates } from '@/db/schema'
import { eq, inArray, count, sql, asc } from 'drizzle-orm'

export interface StatusCounts {
  inspeccion_inicial: number
  recalificacion: number
  por_programar: number
  cita: number
  certificado: number
}

export interface RecentInspectionRow {
  id: string
  licensePlate: string | null
  ownerName: string | null
  status: string
  createdAt: Date | null
}

export interface InspectionSummary {
  id: string
  inspectionDate: Date | null
  licensePlate: string | null
  brand: string | null
  model: string | null
  status: string
  kmCurrent: number | null
  operatorName: string | null
  correlativeNumber: string | null
  appointmentDate: Date | null
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
      correlativeNumber: certificates.correlativeNumber,
      appointmentDate: inspections.appointmentDate,
    })
    .from(inspections)
    .leftJoin(certificates, eq(certificates.inspectionId, inspections.id))
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
    correlativeNumber: r.correlativeNumber ?? null,
    appointmentDate: r.appointmentDate ?? null,
  }))
}

export async function getInspectionById(id: string) {
  const [inspection] = await db
    .select()
    .from(inspections)
    .where(eq(inspections.id, id))

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

  return {
    ...inspection,
    vehicle,
    owner,
    answers,
    attachments,
    signature,
  }
}

export async function getInspectionsByVehicleId(vehicleId: string) {
  const records = await db
    .select({
      id: inspections.id,
      inspectionDate: inspections.inspectionDate,
      status: inspections.status,
      kmCurrent: inspections.kmCurrent,
      operatorId: inspections.operatorId,
    })
    .from(inspections)
    .where(eq(inspections.vehicleId, vehicleId))
    .orderBy(inspections.inspectionDate)

  return records
}

export async function countInspectionsByStatus(): Promise<StatusCounts> {
  const rows = await db
    .select({
      status: inspections.status,
      count: count(inspections.id),
    })
    .from(inspections)
    .groupBy(inspections.status)

  const result: StatusCounts = {
    inspeccion_inicial: 0,
    recalificacion: 0,
    por_programar: 0,
    cita: 0,
    certificado: 0,
  }

  for (const row of rows) {
    if (row.status) {
      result[row.status as keyof StatusCounts] = Number(row.count)
    }
  }

  return result
}

export async function countInspectionsToday(): Promise<number> {
  const [row] = await db
    .select({ count: count(inspections.id) })
    .from(inspections)
    .where(sql`DATE(${inspections.inspectionDate}) = CURRENT_DATE`)

  return Number(row?.count ?? 0)
}

export async function getRecentInspectionsWithOwner(limit = 5): Promise<RecentInspectionRow[]> {
  const rows = await db
    .select({
      id: inspections.id,
      licensePlate: vehicles.licensePlate,
      ownerName: owners.fullName,
      status: sql<string>`COALESCE(${inspections.status}, 'inspeccion_inicial')`,
      createdAt: inspections.createdAt,
    })
    .from(inspections)
    .leftJoin(vehicles, eq(inspections.vehicleId, vehicles.id))
    .leftJoin(owners, eq(vehicles.ownerId, owners.id))
    .orderBy(sql`${inspections.createdAt} DESC`)
    .limit(limit)

  return rows
}

export interface NonCompliantAnswer {
  id: string
  inspectionId: string | null
  section: string
  questionKey: string
  answer: boolean | null
  observations: string | null
}

export async function getNonCompliantAnswers(inspectionId: string): Promise<NonCompliantAnswer[]> {
  const answers = await db
    .select()
    .from(inspectionAnswers)
    .where(eq(inspectionAnswers.inspectionId, inspectionId))

  return answers.filter((a) => a.answer === false)
}

// ─── Answer Toggle (atomic compare-and-swap) ───────────────
function cycleAnswer(current: boolean | null): boolean | null {
  if (current === null) return true
  if (current === true) return false
  return null
}

export async function cycleInspectionAnswer(
  answerId: string,
  expectedAnswer: boolean | null,
): Promise<{ success: true; answer: boolean | null } | { success: false; error: string }> {
  const nextAnswer = cycleAnswer(expectedAnswer)

  const [updated] = await db
    .update(inspectionAnswers)
    .set({ answer: nextAnswer, updatedAt: new Date() })
    .where(
      sql`${inspectionAnswers.id} = ${answerId} AND ${inspectionAnswers.answer} IS NOT DISTINCT FROM ${expectedAnswer}`,
    )
    .returning({ id: inspectionAnswers.id, answer: inspectionAnswers.answer })

  if (!updated) {
    return { success: false, error: 'La respuesta fue modificada por otro usuario. Recargue la página.' }
  }

  return { success: true, answer: updated.answer }
}

export async function getPostMountAttachments(inspectionId: string) {
  const attachments = await db
    .select()
    .from(inspectionAttachments)
    .where(eq(inspectionAttachments.inspectionId, inspectionId))

  return attachments.filter((a) => a.category === 'post_mount')
}

// ─── Schedule Appointment ──────────────────────────────────────

export async function scheduleAppointment(
  inspectionId: string,
  appointmentDate: Date,
): Promise<{ success: true } | { success: false; error: string }> {
  // Verify inspection exists and status is por_programar
  const [inspection] = await db
    .select({ id: inspections.id, status: inspections.status })
    .from(inspections)
    .where(eq(inspections.id, inspectionId))
    .limit(1)

  if (!inspection) {
    return { success: false, error: 'Inspección no encontrada' }
  }

  if (inspection.status !== 'por_programar' && inspection.status !== 'cita') {
    return { success: false, error: 'La inspección debe estar en estado "por programar" o "cita"' }
  }

  // Verify appointmentDate is in the future
  if (appointmentDate <= new Date()) {
    return { success: false, error: 'La fecha de la cita debe ser futura' }
  }

  // Update appointment date; transition status to cita only if currently por_programar
  await db
    .update(inspections)
    .set({
      appointmentDate,
      ...(inspection.status === 'por_programar' ? { status: 'cita' } : {}),
      updatedAt: new Date(),
    })
    .where(eq(inspections.id, inspectionId))

  return { success: true }
}
