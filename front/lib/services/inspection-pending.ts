import { db } from '@/lib/db'
import { inspections, inspectionAnswers, inspectionAttachments, gncCylinders, certificates, signatures } from '@/db/schema'
import { eq, inArray, sql, and } from 'drizzle-orm'

// ─── Types ───────────────────────────────────────────────────────

export interface PendingItems {
  /** How many checklist items were answered "No" (non-compliant) */
  nonCompliantCount: number
  /** How many checklist items are still unanswered (null) */
  unansweredCount: number
  /** Cylinders still in "en_planta" status (waiting for recertification) */
  cylindersInPlant: number
  /** Whether the owner's signature has been captured */
  hasSignature: boolean
  /** Whether post-mount photos exist */
  hasPostMountPhotos: boolean
  /** Whether a certificate exists */
  hasCertificate: boolean
  /** Derived: issues that BLOCK closing the inspection */
  totalBlocking: number
  /** Derived: things that need attention but don't block */
  totalWarnings: number
  /** Derived: grand total */
  totalPending: number
}

export interface InspectionPendingRow {
  id: string
  licensePlate: string | null
  ownerName: string | null
  status: string
  createdAt: Date | null
  pending: PendingItems
}

// ─── Batch query (efficient for lists) ───────────────────────────

export async function getPendingSummaries(
  inspectionIds: string[]
): Promise<Map<string, PendingItems>> {
  const result = new Map<string, PendingItems>()

  if (inspectionIds.length === 0) return result

  // 1. Non-compliant answers per inspection
  const nonCompliantRows = await db
    .select({
      inspectionId: inspectionAnswers.inspectionId,
      count: sql<number>`count(*)`,
    })
    .from(inspectionAnswers)
    .where(
      and(
        inArray(inspectionAnswers.inspectionId, inspectionIds),
        eq(inspectionAnswers.answer, false)
      )
    )
    .groupBy(inspectionAnswers.inspectionId)

  const nonCompliantMap = new Map(
    nonCompliantRows.map((r) => [r.inspectionId, Number(r.count)])
  )

  // 2. Unanswered items per inspection
  const unansweredRows = await db
    .select({
      inspectionId: inspectionAnswers.inspectionId,
      count: sql<number>`count(*)`,
    })
    .from(inspectionAnswers)
    .where(
      and(
        inArray(inspectionAnswers.inspectionId, inspectionIds),
        sql`${inspectionAnswers.answer} IS NULL`
      )
    )
    .groupBy(inspectionAnswers.inspectionId)

  const unansweredMap = new Map(
    unansweredRows.map((r) => [r.inspectionId, Number(r.count)])
  )

  // 3. Post-mount photos per inspection
  const photoRows = await db
    .select({
      inspectionId: inspectionAttachments.inspectionId,
      count: sql<number>`count(*)`,
    })
    .from(inspectionAttachments)
    .where(
      and(
        inArray(inspectionAttachments.inspectionId, inspectionIds),
        eq(inspectionAttachments.category, 'post_mount')
      )
    )
    .groupBy(inspectionAttachments.inspectionId)

  const photoMap = new Map(
    photoRows.map((r) => [r.inspectionId, Number(r.count)])
  )

  // 4. Signature status per inspection
  const sigRows = await db
    .select({ id: inspections.id, signatureId: inspections.ownerSignatureId })
    .from(inspections)
    .where(inArray(inspections.id, inspectionIds))

  const sigMap = new Map(
    sigRows.map((r) => [r.id, r.signatureId !== null])
  )

  // 5. Get vehicleIds for these inspections
  const vehicleRows = await db
    .select({ id: inspections.id, vehicleId: inspections.vehicleId })
    .from(inspections)
    .where(inArray(inspections.id, inspectionIds))

  const vehicleIds = vehicleRows
    .map((r) => r.vehicleId)
    .filter((v): v is string => v !== null)

  // 6. Cylinders en_planta per vehicle
  const cylinderMap = new Map<string, number>()
  if (vehicleIds.length > 0) {
    const cylRows = await db
      .select({
        vehicleId: gncCylinders.vehicleId,
        count: sql<number>`count(*)`,
      })
      .from(gncCylinders)
      .where(
        and(
          inArray(gncCylinders.vehicleId, vehicleIds),
          eq(gncCylinders.status, 'en_planta')
        )
      )
      .groupBy(gncCylinders.vehicleId)

    for (const row of cylRows) {
      if (row.vehicleId) {
        cylinderMap.set(row.vehicleId, Number(row.count))
      }
    }
  }

  // 7. Certificate status per inspection
  const certRows = await db
    .select({
      inspectionId: certificates.inspectionId,
    })
    .from(certificates)
    .where(inArray(certificates.inspectionId, inspectionIds))

  const certSet = new Set(certRows.map((r) => r.inspectionId))

  // 8. Build result
  const vehicleToInsp = new Map(
    vehicleRows
      .filter((r) => r.vehicleId !== null)
      .map((r) => [r.vehicleId!, r.id])
  )

  for (const id of inspectionIds) {
    const nc = nonCompliantMap.get(id) ?? 0
    const ua = unansweredMap.get(id) ?? 0
    const photos = photoMap.get(id) ?? 0
    const hasSig = sigMap.get(id) ?? false
    const vehicleId = vehicleRows.find((r) => r.id === id)?.vehicleId
    const cyls = vehicleId ? cylinderMap.get(vehicleId) ?? 0 : 0
    const hasCert = certSet.has(id)

    // Blocking issues: non-compliant items
    // Warnings: cylinders in plant + missing post-mount photos
    const blocking = nc
    const warnings = cyls + (photos === 0 ? 1 : 0)

    result.set(id, {
      nonCompliantCount: nc,
      unansweredCount: ua,
      cylindersInPlant: cyls,
      hasSignature: hasSig,
      hasPostMountPhotos: photos > 0,
      hasCertificate: hasCert,
      totalBlocking: blocking,
      totalWarnings: warnings,
      totalPending: blocking + warnings,
    })
  }

  return result
}

// ─── Single inspection query ────────────────────────────────────

export async function getPendingSummary(
  inspectionId: string
): Promise<PendingItems | null> {
  const map = await getPendingSummaries([inspectionId])
  return map.get(inspectionId) ?? null
}

// ─── Dashboard pending alerts ───────────────────────────────────

export interface PendingAlert {
  inspectionId: string
  licensePlate: string | null
  ownerName: string | null
  status: string
  createdAt: Date | null
  pending: PendingItems
}

export async function getPendingAlerts(limit = 10): Promise<PendingAlert[]> {
  // Get all non-finalized inspections (and finalized ones missing certs)
  const rows = await db
    .select({
      id: inspections.id,
      status: inspections.status,
      licensePlate: sql<string>`null`,
      ownerName: sql<string>`null`,
      createdAt: inspections.createdAt,
    })
    .from(inspections)
    .orderBy(inspections.createdAt)

  const allIds = rows.map((r) => r.id)
  if (allIds.length === 0) return []

  // Filter out finalized ones with completed certificates first
  // We need pending summaries to know which have issues
  const pendingMap = await getPendingSummaries(allIds)

  // Build alerts: inspections that have pending items (blocking or warnings)
  const alerts: PendingAlert[] = []

  for (const row of rows) {
    const pending = pendingMap.get(row.id)
    if (!pending) continue

    // Skip certificado inspections with everything resolved
    if (
      row.status === 'certificado' &&
      pending.totalBlocking === 0 &&
      pending.totalWarnings === 0 &&
      pending.hasCertificate
    ) {
      continue
    }

    // Skip inspections with zero pending at all
    if (pending.totalPending === 0 && pending.hasCertificate) continue

    alerts.push({
      inspectionId: row.id,
      licensePlate: row.licensePlate,
      ownerName: row.ownerName,
      status: row.status ?? 'inspeccion_inicial',
      createdAt: row.createdAt,
      pending,
    })
  }

  // Sort: blocking first, then by warnings, then by date
  alerts.sort((a, b) => {
    if (b.pending.totalBlocking !== a.pending.totalBlocking) {
      return b.pending.totalBlocking - a.pending.totalBlocking
    }
    if (b.pending.totalWarnings !== a.pending.totalWarnings) {
      return b.pending.totalWarnings - a.pending.totalWarnings
    }
    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
  })

  return alerts.slice(0, limit)
}
