import { db } from '@/lib/db'
import { certificates } from '@/db/schema'
import { eq } from 'drizzle-orm'

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
