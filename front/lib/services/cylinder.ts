import { db } from '@/lib/db'
import { gncCylinders, inspections } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'

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

  // Step 2: select cylinders ordered with en_planta first, then pendiente_reinstalacion, then others
  return await db
    .select()
    .from(gncCylinders)
    .where(eq(gncCylinders.vehicleId, inspection.vehicleId))
    .orderBy(
      sql`CASE 
        WHEN ${gncCylinders.status} = 'en_planta' THEN 0 
        WHEN ${gncCylinders.status} = 'pendiente_reinstalacion' THEN 1 
        ELSE 2 
      END`,
      gncCylinders.createdAt,
    )
}

// ─── Auto-transition cylinders based on inspection status ──────────

type CylinderStatus = typeof gncCylinders.status.enumValues[number]

export interface AutoTransitionResult {
  success: boolean
  transitioned: number
  error?: string
}

/**
 * Automatically transitions cylinder statuses based on inspection workflow.
 *
 * Rules:
 * - inspeccion_inicial creation: all 'instalado' cylinders → 'desmontado'
 * - inspeccion_inicial → recalificacion: all 'desmontado' cylinders → 'en_planta'
 * - cita → certificado: all 'pendiente_reinstalacion' cylinders → 'reinstalado'
 */
export async function autoTransitionCylinders(
  vehicleId: string,
  triggerStatus: 'inspeccion_inicial' | 'recalificacion' | 'certificado',
): Promise<AutoTransitionResult> {
  try {
    let fromStatus: CylinderStatus
    let toStatus: CylinderStatus

    switch (triggerStatus) {
      case 'inspeccion_inicial':
        fromStatus = 'instalado'
        toStatus = 'desmontado'
        break
      case 'recalificacion':
        fromStatus = 'desmontado'
        toStatus = 'en_planta'
        break
      case 'certificado':
        fromStatus = 'pendiente_reinstalacion'
        toStatus = 'reinstalado'
        break
      default:
        return { success: false, transitioned: 0, error: `Unknown trigger status: ${triggerStatus}` }
    }

    const result = await db
      .update(gncCylinders)
      .set({ status: toStatus, updatedAt: new Date() })
      .where(
        and(
          eq(gncCylinders.vehicleId, vehicleId),
          eq(gncCylinders.status, fromStatus),
        ),
      )

    return { success: true, transitioned: result.rowCount ?? 0 }
  } catch (e) {
    console.error('Error in autoTransitionCylinders:', e)
    return { success: false, transitioned: 0, error: 'Error transitioning cylinders' }
  }
}

// ─── Decide cylinder fate (recertification at por_programar) ──────

export interface DecideCylinderFateInput {
  cylinderId: string
  inspectionId: string
  status: 'pendiente_reinstalacion' | 'condenado'
  actualSerial?: string
  recalificationDate?: string
  updatedBy: string
}

export interface DecideCylinderFateResult {
  success: boolean
  error?: string
}

/**
 * Handles the recertification decision for a cylinder at por_programar status.
 * Updates status, serial, and recalification date in one operation.
 */
export async function decideCylinderFate(
  input: DecideCylinderFateInput,
): Promise<DecideCylinderFateResult> {
  try {
    // Verify cylinder is in en_planta
    const [cylinder] = await db
      .select({ status: gncCylinders.status })
      .from(gncCylinders)
      .where(eq(gncCylinders.id, input.cylinderId))
      .limit(1)

    if (!cylinder) {
      return { success: false, error: 'Cilindro no encontrado' }
    }

    if (cylinder.status !== 'en_planta') {
      return { success: false, error: `Solo se pueden decidir cilindros en 'en_planta', actual: ${cylinder.status}` }
    }

    await db
      .update(gncCylinders)
      .set({
        status: input.status,
        actualSerial: input.actualSerial || null,
        recalificationDate: input.recalificationDate || null,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(gncCylinders.id, input.cylinderId))

    return { success: true }
  } catch (e) {
    console.error('Error in decideCylinderFate:', e)
    return { success: false, error: 'Error al decidir el destino del cilindro' }
  }
}

// ─── Get pending cylinders ─────────────────────────────────────────

export interface PendingCylinder {
  id: string
  vehicleId: string | null
  brand: string
  capacity: string
  initialSerial: string
  actualSerial: string | null
  status: string | null
  location: string
  recalificationDate: string | null
}

/**
 * Returns cylinders that need action for a given vehicle.
 * - 'en_planta': awaiting recertification decision
 * - 'pendiente_reinstalacion': awaiting re-mounting confirmation
 */
export async function getPendingCylinders(vehicleId: string): Promise<PendingCylinder[]> {
  return await db
    .select()
    .from(gncCylinders)
    .where(
      and(
        eq(gncCylinders.vehicleId, vehicleId),
        inArray(gncCylinders.status, ['en_planta', 'pendiente_reinstalacion']),
      ),
    )
    .orderBy(gncCylinders.createdAt)
}
