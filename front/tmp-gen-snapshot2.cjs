const fs = require('fs')
const s3 = JSON.parse(fs.readFileSync('./db/migrations/meta/0003_snapshot.json', 'utf8'))

const sNew = JSON.parse(JSON.stringify(s3))
sNew.id = '00000000-0000-0000-0000-000000000000'
sNew.prevId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' // 0004.id

// Only update what changed in our migration
// 1. cylinder_status: added 'instalado' and 'reinstalado', renamed 'montado'->'instalado', 'de_baja'->'condenado'
sNew.enums['public.cylinder_status'].values = ['instalado', 'en_planta', 'pendiente_reinstalacion', 'reinstalado', 'condenado']

// 2. inspection_status: added 'cita'
sNew.enums['public.inspection_status'].values = ['inspeccion_inicial', 'recalificacion', 'por_programar', 'cita', 'certificado']

// 3. gnc_cylinders: status default changed from 'montado' to 'instalado'
sNew.tables['public.gnc_cylinders'].columns['status'].default = "'instalado'"

// 4. inspections: added appointment_date column
sNew.tables['public.inspections'].columns['appointment_date'] = {
  name: 'appointment_date',
  type: 'timestamp',
  primaryKey: false,
  notNull: false,
}

// 5. inspections: added appointment_date index
sNew.tables['public.inspections'].indexes['idx_inspections_appointment_date'] = {
  name: 'idx_inspections_appointment_date',
  columns: [{ expression: 'appointment_date', isExpression: false, asc: true, nulls: 'last' }],
  isUnique: false,
  concurrently: false,
  method: 'btree',
  with: {},
}

fs.writeFileSync('./db/migrations/meta/0005_snapshot.json', JSON.stringify(sNew, null, 2))
console.log('Written 0005 from 0003 template, prevId=0004.id')
