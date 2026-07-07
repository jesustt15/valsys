const fs = require('fs')
const crypto = require('crypto')
const s4 = require('./db/migrations/meta/0004_snapshot.json')

// Save 0004 id as prevId, generate new id for 0005
s4.id = crypto.randomUUID()
s4.prevId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// Update cylinder_status enum
s4.enums['public.cylinder_status'].values = [
  'instalado', 'en_planta', 'pendiente_reinstalacion', 'reinstalado', 'condenado',
]

// Update inspection_status enum
s4.enums['public.inspection_status'].values = [
  'inspeccion_inicial', 'recalificacion', 'por_programar', 'cita', 'certificado',
]

// Update gnc_cylinders.status default
s4.tables['public.gnc_cylinders'].columns['status'].default = "'instalado'"

// Add appointment_date column to inspections
const inspCols = s4.tables['public.inspections'].columns
inspCols['appointment_date'] = {
  name: 'appointment_date',
  type: 'timestamp',
  primaryKey: false,
  notNull: false,
}

// Add index for appointment_date
const inspTable = s4.tables['public.inspections']
inspTable.indexes['idx_inspections_appointment_date'] = {
  name: 'idx_inspections_appointment_date',
  columns: [
    {
      expression: 'appointment_date',
      isExpression: false,
      asc: true,
      nulls: 'last',
    },
  ],
  isUnique: false,
  concurrently: false,
  method: 'btree',
  with: {},
}

// Write 0005_snapshot.json
fs.writeFileSync('./db/migrations/meta/0005_snapshot.json', JSON.stringify(s4, null, 2))
console.log('✅ 0005_snapshot.json created')
console.log('  id:', s4.id)
