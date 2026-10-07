import { db } from '@/lib/db'
import { gncCylinders, inspections } from '@/db/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'

// ─── Business error sentinel (F11) ──────────────────────────────────────────

/**
 * Thrown for precondition / business-rule violations whose messages are safe
 * to surface to the operator. Unexpected errors (DB down, network, etc.) are
 * NOT BusinessErrors — they get a generic message and full context is logged.
 */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BusinessError'
  }
}

export async function getCylindersByVehicleId(vehicleId: string) {
  return await db
    .select()
    .from(gncCylinders)
    .where(eq(gncCylinders.vehicleId, vehicleId))
    .orderBy(gncCylinders.createdAt)
}

export async function getCylindersByInspectionId(inspectionId: string) {
  // Step 1: get vehicleId from inspection
  const [inspection] = await db
    .select({ vehicleId: inspections.vehicleId })
    .from(inspections)
    .where(eq(inspections.id, inspectionId))
    .limit(1)

  if (!inspection?.vehicleId) {
    return []
  }

  // Step 2: select cylinders ordered with en_certificacion first, then others
  return await db
    .select()
    .from(gncCylinders)
    .where(eq(gncCylinders.vehicleId, inspection.vehicleId))
    .orderBy(
      sql`CASE 
        WHEN ${gncCylinders.status} = 'en_certificacion' THEN 0 
        ELSE 1 
      END`,
      gncCylinders.createdAt,
    )
}

// ─── Shared ownership/inspection guards (pure, exported for tests) ─────

/**
 * Pure precondition check: asserts every cylinder belongs to the inspection's
 * vehicle and has the expected status. Throws BusinessError on violation.
 * FAIL CLOSED: null vehicleId on the inspection rejects (null===null must not
 * pass — mirrors the bulk-service guard).
 */
export function assertCylinderOwnership(
  cylinders: ReadonlyArray<{ vehicleId: string | null; status: string | null; initialSerial: string }>,
  inspection: { vehicleId: string | null },
  expectedStatus: string,
  statusErrorLabel: string,
): void {
  // G1: fail closed when inspection has no vehicle
  if (!inspection.vehicleId) {
    throw new BusinessError('La inspección no tiene vehículo asociado')
  }
  for (const c of cylinders) {
    if (c.vehicleId !== inspection.vehicleId) {
      throw new BusinessError(
        `El cilindro serial ${c.initialSerial} no pertenece a este vehículo`,
      )
    }
    if (c.status !== expectedStatus) {
      const statusLabel = c.status ?? 'sin estado registrado'
      throw new BusinessError(
        `El cilindro serial ${c.initialSerial} ${statusErrorLabel} (estado actual: ${statusLabel})`,
      )
    }
  }
}

// ─── Send cylinder to plant ────────────────────────────────────────

export interface SendToPlantInput {
  cylinderId: string
  inspectionId: string
  sentAt: Date
  updatedBy: string
}

/**
 * Sends a cylinder to the certification plant.
 * Cylinder must be 'activo' AND belong to the inspection's vehicle.
 * Transitions to 'en_certificacion'.
 * The UPDATE WHERE clause re-asserts the expected status to prevent races.
 */
export async function sendCylinderToPlant(input: SendToPlantInput): Promise<{ success: boolean; error?: string }> {
  try {
    // G1: load inspection for ownership check
    const [inspection] = await db
      .select({ vehicleId: inspections.vehicleId })
      .from(inspections)
      .where(eq(inspections.id, input.inspectionId))
      .limit(1)

    if (!inspection) {
      return { success: false, error: 'Inspección no encontrada' }
    }

    // G1: load cylinder with vehicleId + initialSerial for guard
    const [cylinder] = await db
      .select({
        status: gncCylinders.status,
        vehicleId: gncCylinders.vehicleId,
        initialSerial: gncCylinders.initialSerial,
      })
      .from(gncCylinders)
      .where(eq(gncCylinders.id, input.cylinderId))
      .limit(1)

    if (!cylinder) {
      return { success: false, error: 'Cilindro no encontrado' }
    }

    // G1: ownership + status guard (fail closed on null vehicleId)
    try {
      assertCylinderOwnership(
        [cylinder],
        inspection,
        'activo',
        'no está activo',
      )
    } catch (e) {
      if (e instanceof BusinessError) {
        return { success: false, error: e.message }
      }
      throw e
    }

    // F4: status-conditional UPDATE — only transitions if still 'activo'
    const [updated] = await db
      .update(gncCylinders)
      .set({
        status: 'en_certificacion',
        updatedBy: input.updatedBy,
        updatedAt: input.sentAt,
      })
      .where(and(
        eq(gncCylinders.id, input.cylinderId),
        eq(gncCylinders.status, 'activo'),
      ))
      .returning({ id: gncCylinders.id })

    if (!updated) {
      return { success: false, error: 'El estado del cilindro cambió. Reintente.' }
    }

    return { success: true }
  } catch (e) {
    if (e instanceof BusinessError) {
      return { success: false, error: e.message }
    }
    console.error('Error in sendCylinderToPlant:', { cylinderId: input.cylinderId, inspectionId: input.inspectionId, error: e })
    return { success: false, error: 'Error al enviar el cilindro a planta' }
  }
}

// ─── Receive cylinder from plant ───────────────────────────────────

export interface ReceiveFromPlantInput {
  cylinderId: string
  inspectionId: string
  result: 'bueno' | 'malo'
  receivedAt: Date
  actualSerial?: string
  recalificationDate?: string
  updatedBy: string
}

/**
 * Receives a cylinder back from the certification plant.
 * Cylinder must be 'en_certificacion'.
 * - 'bueno': transitions to 'activo', sets actualSerial and recalificationDate
 * - 'malo': transitions to 'de_baja'
 * The UPDATE WHERE clause re-asserts the expected status to prevent races.
 */
export async function receiveCylinderFromPlant(input: ReceiveFromPlantInput): Promise<{ success: boolean; error?: string }> {
  try {
    // G1: load inspection for ownership check
    const [inspection] = await db
      .select({ vehicleId: inspections.vehicleId })
      .from(inspections)
      .where(eq(inspections.id, input.inspectionId))
      .limit(1)

    if (!inspection) {
      return { success: false, error: 'Inspección no encontrada' }
    }

    // G1: load cylinder with vehicleId + initialSerial for guard
    const [cylinder] = await db
      .select({
        status: gncCylinders.status,
        vehicleId: gncCylinders.vehicleId,
        initialSerial: gncCylinders.initialSerial,
      })
      .from(gncCylinders)
      .where(eq(gncCylinders.id, input.cylinderId))
      .limit(1)

    if (!cylinder) {
      return { success: false, error: 'Cilindro no encontrado' }
    }

    // G1: ownership + status guard (fail closed on null vehicleId)
    try {
      assertCylinderOwnership(
        [cylinder],
        inspection,
        'en_certificacion',
        'no está en certificación',
      )
    } catch (e) {
      if (e instanceof BusinessError) {
        return { success: false, error: e.message }
      }
      throw e
    }

    const newStatus = input.result === 'bueno' ? 'activo' : 'de_baja'

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedBy: input.updatedBy,
      updatedAt: input.receivedAt,
    }

    if (input.result === 'bueno') {
      if (input.actualSerial) {
        updateData.actualSerial = input.actualSerial
      }
      if (input.recalificationDate) {
        updateData.recalificationDate = input.recalificationDate
      }
    }

    // F4: status-conditional UPDATE — only transitions if still 'en_certificacion'
    const [updated] = await db
      .update(gncCylinders)
      .set(updateData)
      .where(and(
        eq(gncCylinders.id, input.cylinderId),
        eq(gncCylinders.status, 'en_certificacion'),
      ))
      .returning({ id: gncCylinders.id })

    if (!updated) {
      return { success: false, error: 'El estado del cilindro cambió. Reintente.' }
    }

    return { success: true }
  } catch (e) {
    console.error('Error in receiveCylinderFromPlant:', { cylinderId: input.cylinderId, inspectionId: input.inspectionId, error: e })
    return { success: false, error: 'Error al recibir el cilindro de planta' }
  }
}

// ─── Unlink cylinder from vehicle ──────────────────────────────────

export interface UnlinkCylinderResult {
  success: boolean
  error?: string
}

/**
 * Unlinks a cylinder from its vehicle so it becomes available for reassignment.
 * Only allowed when:
 *  - The parent inspection is still in 'inspeccion_inicial'
 *  - The cylinder is 'en_certificacion' (G3 contract — faithful translation
 *    of the pre-simplification unlinkable states)
 *  - The cylinder belongs to the inspection's vehicle (G1)
 *  - The inspection has a non-null vehicleId (G1 fail-closed)
 */
export async function unlinkCylinderFromVehicle(
  cylinderId: string,
  inspectionId: string,
): Promise<UnlinkCylinderResult> {
  try {
    // G1 + G3: load inspection with vehicleId for ownership check
    const [inspection] = await db
      .select({ status: inspections.status, vehicleId: inspections.vehicleId })
      .from(inspections)
      .where(eq(inspections.id, inspectionId))
      .limit(1)

    if (!inspection) {
      return { success: false, error: 'Inspección no encontrada' }
    }



    // G1: fail closed when inspection has no vehicle
    if (!inspection.vehicleId) {
      return { success: false, error: 'La inspección no tiene vehículo asociado' }
    }

    // G1 + G3: load cylinder with vehicleId + initialSerial
    const [cylinder] = await db
      .select({
        status: gncCylinders.status,
        vehicleId: gncCylinders.vehicleId,
        initialSerial: gncCylinders.initialSerial,
      })
      .from(gncCylinders)
      .where(eq(gncCylinders.id, cylinderId))
      .limit(1)

    if (!cylinder) {
      return { success: false, error: 'Cilindro no encontrado' }
    }

    // G1: ownership cross-check
    if (cylinder.vehicleId !== inspection.vehicleId) {
      return {
        success: false,
        error: `El cilindro serial ${cylinder.initialSerial} no pertenece a este vehículo`,
      }
    }

    // G3: only 'en_certificacion' is unlinkable
    if (cylinder.status !== 'en_certificacion') {
      const statusLabel = cylinder.status ?? 'sin estado registrado'
      return {
        success: false,
        error: `Solo cilindros en certificación pueden desvincularse (serial ${cylinder.initialSerial}, estado actual: ${statusLabel})`,
      }
    }

    // Unlink: set vehicleId to null
    await db
      .update(gncCylinders)
      .set({ vehicleId: null, updatedAt: new Date() })
      .where(eq(gncCylinders.id, cylinderId))

    return { success: true }
  } catch (e) {
    console.error('Error in unlinkCylinderFromVehicle:', { cylinderId, inspectionId, error: e })
    return { success: false, error: 'Error al desvincular el cilindro' }
  }
}

// ─── Bulk send cylinders to plant ───────────────────────────────────

export interface BulkSendInput {
  cylinderIds: string[]
  inspectionId: string
  sentAt: Date
  updatedBy: string
}

/**
 * Sends multiple cylinders to the certification plant in a single transaction.
 * All cylinders must be 'activo' and belong to the inspection's vehicle.
 * If any precondition fails the whole batch is rejected.
 */
export async function bulkSendCylindersToPlant(
  input: BulkSendInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    return await db.transaction(async (tx) => {
      const [inspection] = await tx
        .select({ vehicleId: inspections.vehicleId })
        .from(inspections)
        .where(eq(inspections.id, input.inspectionId))
        .limit(1)

      if (!inspection) {
        throw new BusinessError('Inspección no encontrada')
      }

      // F7: select initialSerial for actionable precondition errors
      const cylinders = await tx
        .select({
          id: gncCylinders.id,
          status: gncCylinders.status,
          vehicleId: gncCylinders.vehicleId,
          initialSerial: gncCylinders.initialSerial,
        })
        .from(gncCylinders)
        .where(inArray(gncCylinders.id, input.cylinderIds))

      if (cylinders.length !== input.cylinderIds.length) {
        throw new BusinessError('Algunos cilindros no fueron encontrados')
      }

      // G1: shared ownership/status guard (fail closed on null vehicleId)
      assertCylinderOwnership(cylinders, inspection, 'activo', 'no está activo')

      // F4: status-conditional UPDATE with affected-row assertion
      const updated = await tx
        .update(gncCylinders)
        .set({
          status: 'en_certificacion',
          updatedBy: input.updatedBy,
          updatedAt: input.sentAt,
        })
        .where(and(
          inArray(gncCylinders.id, input.cylinderIds),
          eq(gncCylinders.status, 'activo'),
        ))
        .returning({ id: gncCylinders.id })

      if (updated.length !== input.cylinderIds.length) {
        throw new BusinessError(
          `El estado de algunos cilindros cambió durante la operación. Se esperaba actualizar ${input.cylinderIds.length}, se actualizaron ${updated.length}. Reintente.`,
        )
      }

      return { success: true as const }
    })
  } catch (e) {
    if (e instanceof BusinessError) {
      return { success: false, error: e.message }
    }
    console.error('Error in bulkSendCylindersToPlant:', {
      inspectionId: input.inspectionId,
      cylinderIds: input.cylinderIds,
      error: e,
    })
    return { success: false, error: 'Error inesperado. Reintente.' }
  }
}

// ─── Bulk receive cylinders from plant ──────────────────────────────

export interface BulkReceiveInput {
  cylinderIds: string[]
  inspectionId: string
  result: 'bueno' | 'malo'
  receivedAt: Date
  recalificationDate?: string
  updatedBy: string
}

/**
 * Receives multiple cylinders back from the certification plant in a single
 * transaction. All cylinders must be 'en_certificacion' and belong to the
 * inspection's vehicle. A shared result ('bueno' → activo, 'malo' → de_baja)
 * is applied to every cylinder. The caller (action) is responsible for
 * uploading and attaching the plant document after the tx succeeds.
 */
export async function bulkReceiveCylindersFromPlant(
  input: BulkReceiveInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    return await db.transaction(async (tx) => {
      // F1: load inspection for vehicle ownership check
      const [inspection] = await tx
        .select({ vehicleId: inspections.vehicleId })
        .from(inspections)
        .where(eq(inspections.id, input.inspectionId))
        .limit(1)

      if (!inspection) {
        throw new BusinessError('Inspección no encontrada')
      }

      // F7: select initialSerial for actionable precondition errors
      const cylinders = await tx
        .select({
          id: gncCylinders.id,
          status: gncCylinders.status,
          vehicleId: gncCylinders.vehicleId,
          initialSerial: gncCylinders.initialSerial,
        })
        .from(gncCylinders)
        .where(inArray(gncCylinders.id, input.cylinderIds))

      if (cylinders.length !== input.cylinderIds.length) {
        throw new BusinessError('Algunos cilindros no fueron encontrados')
      }

      // G1: shared ownership/status guard (fail closed on null vehicleId)
      assertCylinderOwnership(cylinders, inspection, 'en_certificacion', 'no está en certificación')

      const newStatus = input.result === 'bueno' ? 'activo' : 'de_baja'

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedBy: input.updatedBy,
        updatedAt: input.receivedAt,
      }
      if (input.result === 'bueno' && input.recalificationDate) {
        updateData.recalificationDate = input.recalificationDate
      }

      // F4: status-conditional UPDATE with affected-row assertion
      const updated = await tx
        .update(gncCylinders)
        .set(updateData)
        .where(and(
          inArray(gncCylinders.id, input.cylinderIds),
          eq(gncCylinders.status, 'en_certificacion'),
        ))
        .returning({ id: gncCylinders.id })

      if (updated.length !== input.cylinderIds.length) {
        throw new BusinessError(
          `El estado de algunos cilindros cambió durante la operación. Se esperaba actualizar ${input.cylinderIds.length}, se actualizaron ${updated.length}. Reintente.`,
        )
      }

      // F6: attachment insert is handled by the caller (action) AFTER the
      // MinIO upload succeeds, so we don't end up with a dangling row when
      // the upload fails. The tx only updates cylinder statuses here.

      return { success: true as const }
    })
  } catch (e) {
    if (e instanceof BusinessError) {
      return { success: false, error: e.message }
    }
    console.error('Error in bulkReceiveCylindersFromPlant:', {
      inspectionId: input.inspectionId,
      cylinderIds: input.cylinderIds,
      error: e,
    })
    return { success: false, error: 'Error inesperado. Reintente.' }
  }
}
