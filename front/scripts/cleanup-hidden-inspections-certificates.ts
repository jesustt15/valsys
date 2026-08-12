import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { certificates, inspections } from '@/db/schema'
import { eq, inArray, isNotNull } from 'drizzle-orm'

async function main() {
  const apply =
    process.argv.includes('--apply') || process.env.CLEANUP_APPLY === '1'

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })
  const db = drizzle(pool)

  const orphans = await db
    .select({
      id: certificates.id,
      correlativeNumber: certificates.correlativeNumber,
      inspectionId: certificates.inspectionId,
    })
    .from(certificates)
    .innerJoin(inspections, eq(inspections.id, certificates.inspectionId))
    .where(isNotNull(inspections.deletedAt))

  if (orphans.length === 0) {
    console.log('✅ No hay certificados de inspecciones ocultas. Nada que limpiar.')
    await pool.end()
    return
  }

  console.log(`🔍 ${orphans.length} certificado(s) de inspecciones ocultas:`)
  for (const o of orphans) {
    console.log(`  - ${o.correlativeNumber} (inspección ${o.inspectionId})`)
  }

  if (!apply) {
    console.log('\n🧹 Modo dry-run: no se borró nada. Ejecutá con `--apply` para eliminar.')
    await pool.end()
    return
  }

  await db.delete(certificates).where(inArray(certificates.id, orphans.map((o) => o.id)))

  console.log(`\n✅ Se eliminaron ${orphans.length} certificado(s). Correlativos liberados.`)
  await pool.end()
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})