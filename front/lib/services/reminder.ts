import { db } from '@/lib/db'
import { notifications, gncCylinders, inspections, vehicles, users } from '@/db/schema'
import { eq, and, desc, isNull, inArray, sql, count } from 'drizzle-orm'

const PLANT_REMINDER_INTERVAL_DAYS = 3

export interface PlantWaitingInspection {
  inspectionId: string
  vehicleId: string
  licensePlate: string | null
  ownerName: string | null
  operatorId: string | null
  daysAtPlant: number
  pendingCylinderCount: number
  sentAt: Date
}

/**
 * Returns inspections where cylinders have been en_certificacion for 3+ days.
 * Used by the dashboard banner and by the reminder notification generator.
 */
export async function getPlantWaitingInspections(): Promise<PlantWaitingInspection[]> {
  const rows = await db
    .select({
      inspectionId: inspections.id,
      vehicleId: inspections.vehicleId,
      licensePlate: vehicles.licensePlate,
      ownerName: users.fullName,
      operatorId: inspections.operatorId,
      pendingCylinderCount: count(gncCylinders.id),
      sentAt: sql<string>`min(${gncCylinders.updatedAt})`,
    })
    .from(inspections)
    .innerJoin(gncCylinders, eq(inspections.vehicleId, gncCylinders.vehicleId))
    .innerJoin(vehicles, eq(inspections.vehicleId, vehicles.id))
    .leftJoin(users, eq(vehicles.ownerId, users.id))
    .where(
      and(
        eq(gncCylinders.status, 'en_certificacion'),
        isNull(inspections.deletedAt),
      ),
    )
    .groupBy(
      inspections.id,
      inspections.vehicleId,
      vehicles.licensePlate,
      users.fullName,
      inspections.operatorId,
    )

  const cutoff = Date.now() - PLANT_REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000

  return rows
    .filter((r) => {
      const sentAt = new Date(r.sentAt as string)
      return sentAt.getTime() < cutoff
    })
    .map((r) => {
      const sentAt = new Date(r.sentAt as string)
      return {
        inspectionId: r.inspectionId,
        vehicleId: r.vehicleId!,
        licensePlate: r.licensePlate,
        ownerName: r.ownerName,
        operatorId: r.operatorId,
        daysAtPlant: Math.floor((Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24)),
        pendingCylinderCount: r.pendingCylinderCount,
        sentAt,
      }
    })
}

/**
 * Creates plant_reminder notifications for each inspection whose last reminder
 * is older than PLANT_REMINDER_INTERVAL_DAYS. Idempotent by deduplication.
 * Returns the number of notifications created.
 */
export async function ensurePlantReminders(): Promise<number> {
  const waiting = await getPlantWaitingInspections()
  if (waiting.length === 0) return 0

  // Get all admin/operator users (they receive the reminders)
  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ['admin', 'operator']))

  if (recipients.length === 0) return 0

  let created = 0
  for (const insp of waiting) {
    // Latest plant_reminder for this inspection (any recipient)
    const [latest] = await db
      .select({ createdAt: notifications.createdAt })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'plant_reminder'),
          eq(notifications.relatedEntityId, insp.inspectionId),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(1)

    const shouldCreate =
      !latest ||
      Date.now() - (latest.createdAt?.getTime() ?? 0) > PLANT_REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000

    if (!shouldCreate) continue

    // Build escalation message based on days
    let urgency: string
    if (insp.daysAtPlant >= 10) urgency = '¡Atención! Los cilindros llevan muchos días en planta.'
    else if (insp.daysAtPlant >= 7) urgency = 'El retorno estimado ya pasó — revisar la inspección.'
    else urgency = `Los cilindros están en planta hace ${insp.daysAtPlant} días. Retorno estimado: viernes.`

    const title = `🚚 Cilindros en planta — ${insp.licensePlate ?? 's/p'}`
    const message = `${insp.pendingCylinderCount} cilindro(s) esperando resultado. ${urgency}`

    for (const recipient of recipients) {
      await db.insert(notifications).values({
        userId: recipient.id,
        type: 'plant_reminder',
        title,
        message,
        relatedEntityType: 'inspection',
        relatedEntityId: insp.inspectionId,
      })
      created++
    }
  }

  return created
}
