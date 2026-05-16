import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { hash } from '@node-rs/bcrypt'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })
  const db = drizzle(pool)

  console.log('🌱 Seeding users...\n')

  const adminPassword = await hash('admin123', 10)
  const operatorPassword = await hash('operador123', 10)

  // ── Superadmin ──────────────────────────────────────────────
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.username, 'admin'))
    .limit(1)

  if (existingAdmin.length > 0) {
    console.log('⏭️  Admin user already exists, skipping.')
  } else {
    await db.insert(users).values({
      username: 'admin',
      fullName: 'Administrador',
      email: 'admin@valsys.com',
      passwordHash: adminPassword,
      role: 'admin',
    })
    console.log('✅ Created admin user (username: admin, password: admin123)')
  }

  // ── Test Operator ───────────────────────────────────────────
  const existingOperator = await db
    .select()
    .from(users)
    .where(eq(users.username, 'operador'))
    .limit(1)

  if (existingOperator.length > 0) {
    console.log('⏭️  Operator user already exists, skipping.')
  } else {
    await db.insert(users).values({
      username: 'operador',
      fullName: 'Operador de Prueba',
      email: 'operador@valsys.com',
      passwordHash: operatorPassword,
      role: 'operator',
    })
    console.log('✅ Created operator user (username: operador, password: operador123)')
  }

  await pool.end()
  console.log('\n🎉 Seed complete!')
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
