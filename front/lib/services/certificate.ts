import { db } from '@/lib/db'
import { certificates, inspections, vehicles, owners, gncCylinders } from '@/db/schema'
import { eq, sql, and, inArray } from 'drizzle-orm'

export interface CertificateRecord {
  id: string
  inspectionId: string
  correlativeNumber: string
  plantDocKey: string | null
  finalCertKey: string | null
  issueDate: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface CertificateWithInspection {
  certificate: CertificateRecord
  inspection: typeof inspections.$inferSelect
  vehicle: typeof vehicles.$inferSelect | null
  owner: typeof owners.$inferSelect | null
}

export async function getCertificateByInspectionId(
  inspectionId: string
): Promise<CertificateRecord | null> {
  const [certificate] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.inspectionId, inspectionId))

  if (!certificate) return null

  return {
    id: certificate.id,
    inspectionId: certificate.inspectionId ?? '',
    correlativeNumber: certificate.correlativeNumber,
    plantDocKey: certificate.plantDocKey,
    finalCertKey: certificate.finalCertKey,
    issueDate: certificate.issueDate,
    createdAt: certificate.createdAt,
    updatedAt: certificate.updatedAt,
  }
}

export async function getCertificateByCorrelative(
  correlative: string,
): Promise<CertificateWithInspection | null> {
  const trimmed = correlative.trim()
  const [certificate] = await db
    .select()
    .from(certificates)
    .where(sql`LOWER(${certificates.correlativeNumber}) = LOWER(${trimmed})`)

  if (!certificate) return null

  const [inspection] = certificate.inspectionId
    ? await db.select().from(inspections).where(eq(inspections.id, certificate.inspectionId))
    : [null]

  if (!inspection) return null

  const [vehicle] = inspection.vehicleId
    ? await db.select().from(vehicles).where(eq(vehicles.id, inspection.vehicleId))
    : [null]

  const [owner] = vehicle?.ownerId
    ? await db.select().from(owners).where(eq(owners.id, vehicle.ownerId))
    : [null]

  return {
    certificate: {
      id: certificate.id,
      inspectionId: certificate.inspectionId ?? '',
      correlativeNumber: certificate.correlativeNumber,
      plantDocKey: certificate.plantDocKey,
      finalCertKey: certificate.finalCertKey,
      issueDate: certificate.issueDate,
      createdAt: certificate.createdAt,
      updatedAt: certificate.updatedAt,
    },
    inspection,
    vehicle,
    owner,
  }
}

// ─── Certifiable Cylinders Filter ─────────────────────────────

/**
 * Returns cylinders eligible for certificate document assembly:
 * only those with status 'instalado' or 'reinstalado'.
 * Excludes: en_planta, pendiente_reinstalacion, condenado.
 */
export async function getCertifiableCylinders(inspectionId: string) {
  const [inspection] = await db
    .select({ vehicleId: inspections.vehicleId })
    .from(inspections)
    .where(eq(inspections.id, inspectionId))
    .limit(1)

  if (!inspection?.vehicleId) return []

  return db
    .select()
    .from(gncCylinders)
    .where(
      and(
        eq(gncCylinders.vehicleId, inspection.vehicleId),
        inArray(gncCylinders.status, ['instalado', 'reinstalado'])
      )
    )
}
