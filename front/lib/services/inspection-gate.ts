import { db } from '@/lib/db'
import {
  inspections,
  gncCylinders,
  inspectionAttachments,
  inspectionAnswers,
} from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export interface GateResult {
  canIssue: boolean
  missing: string[]
}

/**
 * Gate-check: verifies all preconditions before issuing a certificate.
 *
 * Checks (in order):
 * 1. All vehicle cylinders in instalado | reinstalado | condenado (none in en_planta or pendiente_reinstalacion)
 * 2. Post-mount photos exist (inspection_attachments category post_mount, count > 0)
 * 3. inspections.ownerSignatureId IS NOT NULL
 * 4. For montados branch: all inspection_answers have non-null answer
 *
 * Branch determination: if inspection_answers exist for this inspection → montados branch.
 * If no answers → desmontados branch (skip checklist check).
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

  // Step 2: Check cylinder statuses
  const cylinders = await db
    .select({ status: gncCylinders.status })
    .from(gncCylinders)
    .where(eq(gncCylinders.vehicleId, inspection.vehicleId))

  const pendingCylinders = cylinders.filter(
    (c) => c.status === 'en_planta' || c.status === 'pendiente_reinstalacion'
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

  // Step 4: Check signature
  if (!inspection.ownerSignatureId) {
    missing.push('signature')
  }

  // Step 5: Check checklist completeness (montados branch only)
  // Determine branch: if inspection_answers exist → montados branch
  const answers = await db
    .select({ id: inspectionAnswers.id, answer: inspectionAnswers.answer })
    .from(inspectionAnswers)
    .where(eq(inspectionAnswers.inspectionId, inspectionId))

  if (answers.length > 0) {
    // Montados branch — check all answers are non-null
    const unanswered = answers.filter((a) => a.answer === null)
    if (unanswered.length > 0) {
      missing.push('checklist_incomplete')
    }
  }
  // If no answers → desmontados branch → skip checklist check

  return {
    canIssue: missing.length === 0,
    missing,
  }
}
