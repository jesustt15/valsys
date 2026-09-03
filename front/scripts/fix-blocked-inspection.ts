import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { inspections, gncCylinders, inspectionAttachments } from '@/db/schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'

/**
 * Diagnoses and fixes inspections blocked by stale cylinder statuses.
 *
 * Finds inspections in 'cita' or 'certificado' status that still have
 * cylinders in non-terminal states (en_planta, pendiente_reinstalacion, desmontado),
 * preventing certificate issuance.
 *
 * Usage:
 *   npx tsx scripts/fix-blocked-inspection.ts                         # dry-run, all blocked
 *   npx tsx scripts/fix-blocked-inspection.ts <inspection-id>         # dry-run, specific inspection
 *   npx tsx scripts/fix-blocked-inspection.ts --apply                 # apply all
 *   npx tsx scripts/fix-blocked-inspection.ts <inspection-id> --apply # apply specific
 */
async function main() {
  const apply = process.argv.includes('--apply')
  const targetId = process.argv.slice(2).find((a) => !a.startsWith('--') && a !== '--apply')

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })
  const db = drizzle(pool)

  const statusesToCheck = ['cita', 'certificado'] as const
  const blockedStatuses = ['en_planta', 'pendiente_reinstalacion', 'desmontado'] as const

  console.log(`🔍 Buscando inspecciones bloqueadas en estados: ${statusesToCheck.join(', ')}`)

  const inspectionsQuery = db
    .select({
      id: inspections.id,
      status: inspections.status,
      vehicleId: inspections.vehicleId,
    })
    .from(inspections)
    .where(
      and(
        inArray(inspections.status, [...statusesToCheck]),
        isNull(inspections.deletedAt),
        targetId ? eq(inspections.id, targetId) : undefined,
      ),
    )

  const blockedInspections = await inspectionsQuery

  if (blockedInspections.length === 0) {
    console.log(targetId
      ? `✅ Inspección ${targetId} no está bloqueada o no existe.`
      : '✅ No hay inspecciones bloqueadas.')
    await pool.end()
    return
  }

  const issues: {
    inspectionId: string
    inspectionStatus: string
    cylinderId: string
    cylinderStatus: string
    brand: string
    capacity: string
    initialSerial: string
    vehicleId: string
  }[] = []

  for (const insp of blockedInspections) {
    if (!insp.vehicleId) continue

    const stuckCylinders = await db
      .select({
        id: gncCylinders.id,
        brand: gncCylinders.brand,
        capacity: gncCylinders.capacity,
        initialSerial: gncCylinders.initialSerial,
        status: gncCylinders.status,
      })
      .from(gncCylinders)
      .where(
        and(
          eq(gncCylinders.vehicleId, insp.vehicleId),
          inArray(gncCylinders.status, [...blockedStatuses]),
        ),
      )

    for (const cyl of stuckCylinders) {
      issues.push({
        inspectionId: insp.id,
        inspectionStatus: insp.status ?? 'unknown',
        cylinderId: cyl.id,
        cylinderStatus: cyl.status ?? 'unknown',
        brand: cyl.brand,
        capacity: cyl.capacity,
        initialSerial: cyl.initialSerial,
        vehicleId: insp.vehicleId,
      })
    }
  }

  if (issues.length === 0) {
    console.log(`✅ Se revisaron ${blockedInspections.length} inspección(es). No hay cilindros bloqueados.`)
    await pool.end()
    return
  }

  console.log(`\n🚨 ${issues.length} cilindro(s) bloqueado(s) en ${blockedInspections.length} inspección(es):\n`)
  for (const issue of issues) {
    console.log(`  Inspección: ${issue.inspectionId} (estado: ${issue.inspectionStatus})`)
    console.log(`  Cilindro: ${issue.brand} ${issue.capacity}L | Serie: ${issue.initialSerial}`)
    console.log(`  Estado actual: ${issue.cylinderStatus} → requiere fix manual`)
    console.log('')
  }

  if (!apply) {
    console.log('🧹 Modo dry-run: no se cambió nada.')
    console.log('Ejecutá con --apply para marcar cilindros en_planta/desmontado → pendiente_reinstalacion')
    console.log('Para cilindros en pendiente_reinstalacion → reinstalado')
    console.log('')
    console.log('⚠️  Si un cilindro específico debe ir a "condenado", hacelo manualmente desde la UI.')
    await pool.end()
    return
  }

  let fixed = 0
  for (const issue of issues) {
    let targetStatus: string

    if (issue.cylinderStatus === 'en_planta' || issue.cylinderStatus === 'desmontado') {
      targetStatus = 'pendiente_reinstalacion'
    } else if (issue.cylinderStatus === 'pendiente_reinstalacion') {
      targetStatus = 'reinstalado'
    } else {
      console.log(`⏭️  Saltando cilindro ${issue.cylinderId} (estado ${issue.cylinderStatus} no tiene transición automática)`)
      continue
    }

    await db
      .update(gncCylinders)
      .set({ status: targetStatus as typeof gncCylinders.status.enumValues[number], updatedAt: new Date() })
      .where(eq(gncCylinders.id, issue.cylinderId))

    console.log(`✅ Cilindro ${issue.cylinderId}: ${issue.cylinderStatus} → ${targetStatus}`)
    fixed++
  }

  console.log(`\n✅ ${fixed} cilindro(s) corregido(s).`)
  await pool.end()
}

main().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
