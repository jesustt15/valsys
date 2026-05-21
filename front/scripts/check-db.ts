import * as dotenv from 'dotenv'
import * as path from 'path'

// Configure dotenv synchronously before importing anything else dynamically
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function run() {
  // Use dynamic imports to ensure process.env is populated before drizzle initializes
  const { db } = await import('../lib/db')
  const { inspections, certificates, inspectionAttachments } = await import('../db/schema')
  const { eq } = await import('drizzle-orm')

  console.log('Querying database...')
  
  const allInspections = await db.select().from(inspections)
  console.log(`Found ${allInspections.length} inspections:`)
  for (const insp of allInspections) {
    console.log(`\nInspection ID: ${insp.id}`)
    console.log(`Status: ${insp.status}`)
    console.log(`Date: ${insp.inspectionDate}`)
    
    // Check certificate
    const certs = await db.select().from(certificates).where(eq(certificates.inspectionId, insp.id))
    console.log(`Certificates (${certs.length}):`, certs.map(c => ({
      id: c.id,
      correlativeNumber: c.correlativeNumber,
      plantDocKey: c.plantDocKey,
      finalCertKey: c.finalCertKey
    })))
    
    // Check attachments
    const atts = await db.select().from(inspectionAttachments).where(eq(inspectionAttachments.inspectionId, insp.id))
    console.log(`Attachments (${atts.length}):`)
    for (const att of atts) {
      console.log(`  - Category: ${att.category}, File: ${att.fileName}, Key: ${att.minioKey}`)
    }
  }
}

run().catch(console.error)
