import { db } from '@/lib/db'
import {
  inspections,
  gncCylinders,
  inspectionAttachments,
} from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export interface GateResult {
  canIssue: boolean
  missing: string[]
}

/**
 * Gate-check: verifies all preconditions before issuing a certificate.
 *
 * Checks (simplified):
 * 1. All vehicle cylinders in final states: reinstalado | condenado
 *    (none in en_planta, pendiente_reinstalacion, desmontado)
 * 2. Post-mount photos exist (inspection_attachments category post_mount, count > 0)
 */
export async function canIssueCertificate(inspectionId: string): Promise<GateResult> {
  const missing: string[] = []

  // Step 1: Get inspection + vehicle
  const [inspection] = await db
    .select()
    .from(inspections)
    .where(eq(inspections.id, inspectionId))
    .limit(1)

  if (!inspection) {
    return { canIssue: false, missing: ['inspection_not_found'] }
  }

  if (!inspection.vehicleId) {
    return { canIssue: false, missing: ['no_vehicle'] }
  }

  // Step 2: Check cylinder statuses — all must be in final states
  const cylinders = await db
    .select({ status: gncCylinders.status })
    .from(gncCylinders)
    .where(eq(gncCylinders.vehicleId, inspection.vehicleId))

  const pendingCylinders = cylinders.filter(
    (c) => c.status === 'desmontado' || c.status === 'en_planta' || c.status === 'pendiente_reinstalacion'
  )
  if (pendingCylinders.length > 0) {
    missing.push('cylinders_pending')
  }

  // Step 3: Check post-mount photos
  const [photoCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inspectionAttachments)
    .where(
      and(
        eq(inspectionAttachments.inspectionId, inspectionId),
        eq(inspectionAttachments.category, 'post_mount')
      )
    )

  if ((photoCount?.count ?? 0) === 0) {
    missing.push('post_mount_photos')
  }

  return {
    canIssue: missing.length === 0,
    missing,
  }
}
