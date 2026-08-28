import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { inspections, gncCylinders } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

/**
 * Fix orphan cylinders stuck in 'en_planta' for inspections already closed.
 *
 * Finds inspections with status 'certificado' that still have cylinders
 * in 'en_planta' (left over from the bug where createCertificateAction
 * did not gate on cylinder states). Updates those cylinders to 'reinstalado'.
 *
 * Usage:
 *   npx tsx scripts/fix-orphan-en-planta-cylinders.ts          # dry-run
 *   npx tsx scripts/fix-orphan-en-planta-cylinders.ts --apply  # apply changes
 */
async function main() {
  const apply = process.argv.includes('--apply') || process.env.FIX_APPLY === '1'

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })
  const db = drizzle(pool)

  // 1. Find all closed inspections
  const closedInspections = await db
    .select({
      id: inspections.id,
      status: inspections.status,
      vehicleId: inspections.vehicleId,
    })
    .from(inspections)
    .where(
      and(
        eq(inspections.status, 'certificado'),
        isNull(inspections.deletedAt)
      )
    )

  if (closedInspections.length === 0) {
    console.log('✅ No hay inspecciones cerradas. Nada que corregir.')
    await pool.end()
    return
  }

  // 2. For each closed inspection, find cylinders stuck in 'en_planta'
  const orphans: {
    inspectionId: string
    cylinderId: string
    brand: string
    capacity: string
    initialSerial: string
    vehicleId: string | null
  }[] = []

  for (const insp of closedInspections) {
    if (!insp.vehicleId) continue

    const stuckCylinders = await db
      .select({
        id: gncCylinders.id,
        brand: gncCylinders.brand,
        capacity: gncCylinders.capacity,
        initialSerial: gncCylinders.initialSerial,
      })
      .from(gncCylinders)
      .where(
        and(
          eq(gncCylinders.vehicleId, insp.vehicleId),
          eq(gncCylinders.status, 'en_planta')
        )
      )

    for (const cyl of stuckCylinders) {
      orphans.push({
        inspectionId: insp.id,
        cylinderId: cyl.id,
        brand: cyl.brand,
        capacity: cyl.capacity,
        initialSerial: cyl.initialSerial,
        vehicleId: insp.vehicleId,
      })
    }
  }

  if (orphans.length === 0) {
    console.log(`✅ Se revisaron ${closedInspections.length} inspección(es) cerrada(s). No hay cilindros en_planta huérfanos.`)
    await pool.end()
    return
  }

  console.log(`🔍 ${orphans.length} cilindro(s) en_planta en ${closedInspections.length} inspección(es) cerrada(s):\n`)
  for (const o of orphans) {
    console.log(`  - Inspección ${o.inspectionId}`)
    console.log(`    Cilindro: ${o.brand} ${o.capacity}L | Serie: ${o.initialSerial} | ID: ${o.cylinderId}`)
  }

  if (!apply) {
    console.log('\n🧹 Modo dry-run: no se cambió nada. Ejecutá con `--apply` para marcar como reinstalado.')
    await pool.end()
    return
  }

  // 3. Update cylinders to 'reinstalado'
  for (const o of orphans) {
    await db
      .update(gncCylinders)
      .set({
        status: 'reinstalado',
        updatedAt: new Date(),
      })
      .where(eq(gncCylinders.id, o.cylinderId))
  }

  console.log(`\n✅ Se marcaron ${orphans.length} cilindro(s) como 'reinstalado'.`)
  await pool.end()
}

main().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
