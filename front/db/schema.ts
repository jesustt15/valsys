import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  integer, 
  jsonb, 
  date, 
  decimal,
  index,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────
export const attachmentCategory = pgEnum('attachment_category', [
  'initial',    // fotos de inspección inicial
  'removal',    // fotos de desmontaje de cilindros
  'post_mount', // fotos después del remontaje
  'plant',      // documentos de planta
  'signature',  // firmas
]);

export const cylinderStatus = pgEnum('cylinder_status', [
  'montado',
  'en_planta',
  'pendiente_reinstalacion',
  'de_baja',
]);

export const inspectionStatus = pgEnum('inspection_status', [
  'inspeccion_inicial',
  'en_planta',
  'finalizado',
]);

export const userRole = pgEnum('user_role', ['admin', 'operator', 'viewer']);

// ─── 1. Signatures (first — referenced by inspections) ──────────
export const signatures = pgTable('signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  minioKey: varchar('minio_key').unique().notNull(),
  signedAt: timestamp('signed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── 2. Users & Owners ──────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username').unique().notNull(),
  fullName: varchar('full_name').notNull(),
  email: varchar('email').unique().notNull(),
  passwordHash: varchar('password_hash').notNull(),
  role: userRole('role').default('operator'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const owners = pgTable('owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: varchar('document_id').unique().notNull(),
  fullName: varchar('full_name').notNull(),
  phone: varchar('phone'),
  email: varchar('email'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  documentIdIdx: index('idx_owners_document_id').on(table.documentId),
}));

// ─── 3. Vehicles ────────────────────────────────────────────────
export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => owners.id, { onDelete: 'set null' }),
  registeredBy: uuid('registered_by').references(() => users.id, { onDelete: 'set null' }),
  vin: varchar('vin').unique().notNull(),
  licensePlate: varchar('license_plate').unique().notNull(),
  vehicleType: varchar('vehicle_type').notNull(),
  brand: varchar('brand'),
  model: varchar('model'),
  year: integer('year'),
  specificAttributes: jsonb('specific_attributes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  vinIdx: index('idx_vehicles_vin').on(table.vin),
  licensePlateIdx: index('idx_vehicles_license_plate').on(table.licensePlate),
  ownerIdx: index('idx_vehicles_owner').on(table.ownerId),
}));

// ─── 4. Cylinders ───────────────────────────────────────────────
export const gncCylinders = pgTable('gnc_cylinders', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  brand: varchar('brand').notNull(),
  capacity: varchar('capacity').notNull(),
  initialSerial: varchar('initial_serial').notNull(),
  actualSerial: varchar('actual_serial'),
  status: cylinderStatus('status').default('montado'),
  recalificationDate: date('recalification_date'),
  location: varchar('location').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  vehicleIdx: index('idx_cylinders_vehicle').on(table.vehicleId),
  serialIdx: index('idx_cylinders_serial').on(table.initialSerial, table.actualSerial),
}));

// ─── 5. Inspections ─────────────────────────────────────────────
export const inspections = pgTable('inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }),
  operatorId: uuid('operator_id').references(() => users.id, { onDelete: 'set null' }),
  ownerSignatureId: uuid('owner_signature_id').references(() => signatures.id, { onDelete: 'set null' }),
  status: inspectionStatus('status').default('inspeccion_inicial'),
  kmCurrent: integer('km_current').notNull(),
  inspectionDate: timestamp('inspection_date').defaultNow(),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  vehicleIdx: index('idx_inspections_vehicle').on(table.vehicleId),
  statusIdx: index('idx_inspections_status').on(table.status),
}));

// ─── 6. Inspection Answers (checklist) ──────────────────────────
export const inspectionAnswers = pgTable('inspection_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }),
  section: varchar('section').notNull(),     // 'front', 'rear'
  questionKey: varchar('question_key').notNull(),
  answer: boolean('answer'),                  // null = pendiente
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  inspectionIdx: index('idx_answers_inspection').on(table.inspectionId),
}));

// ─── 7. Attachments (photos, scans, docs) ───────────────────────
export const inspectionAttachments = pgTable('inspection_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name').notNull(),
  minioKey: varchar('minio_key').unique().notNull(),
  fileType: varchar('file_type').notNull(),
  fileSize: integer('file_size'),             // bytes
  category: attachmentCategory('category').notNull().default('initial'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  inspectionIdx: index('idx_attachments_inspection').on(table.inspectionId),
  categoryIdx: index('idx_attachments_category').on(table.category),
}));

// ─── 8. Certificates ────────────────────────────────────────────
export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }),
  correlativeNumber: varchar('correlative_number').unique().notNull(),
  plantDocKey: varchar('plant_doc_key'),
  finalCertKey: varchar('final_cert_key'),
  issueDate: date('issue_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  correlativeIdx: index('idx_certificates_correlative').on(table.correlativeNumber),
  inspectionIdx: index('idx_certificates_inspection').on(table.inspectionId),
}));

// ─── 9. Notifications ──────────────────────────────────────────
export const notificationType = [
  'cylinder_recertified',
  'cylinder_scrapped',
  'cylinder_sent_to_plant',
  'inspection_pending_items',
  'inspection_non_compliant',
] as const

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { enum: notificationType }).notNull(),
  title: varchar('title').notNull(),
  message: text('message').notNull(),
  relatedEntityType: varchar('related_entity_type', { enum: ['inspection', 'cylinder'] }).notNull(),
  relatedEntityId: uuid('related_entity_id').notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId),
  unreadIdx: index('idx_notifications_unread').on(table.userId, table.readAt),
}));
