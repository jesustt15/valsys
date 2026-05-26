import { relations } from 'drizzle-orm'
import {
  users,
  owners,
  vehicles,
  gncCylinders,
  inspections,
  inspectionAnswers,
  inspectionAttachments,
  certificates,
  signatures,
  notifications,
} from './schema'

// ─── Users ────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  vehicles: many(vehicles),
  cylinders: many(gncCylinders),
  inspections: many(inspections),
  notifications: many(notifications),
}))

// ─── Owners ───────────────────────────────────────────────────
export const ownersRelations = relations(owners, ({ many }) => ({
  vehicles: many(vehicles),
}))

// ─── Vehicles ─────────────────────────────────────────────────
export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(owners, {
    fields: [vehicles.ownerId],
    references: [owners.id],
  }),
  registeredBy: one(users, {
    fields: [vehicles.registeredBy],
    references: [users.id],
  }),
  cylinders: many(gncCylinders),
  inspections: many(inspections),
}))

// ─── Cylinders ────────────────────────────────────────────────
export const gncCylindersRelations = relations(gncCylinders, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [gncCylinders.vehicleId],
    references: [vehicles.id],
  }),
  updatedByUser: one(users, {
    fields: [gncCylinders.updatedBy],
    references: [users.id],
  }),
}))

// ─── Inspections ──────────────────────────────────────────────
export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [inspections.vehicleId],
    references: [vehicles.id],
  }),
  operator: one(users, {
    fields: [inspections.operatorId],
    references: [users.id],
  }),
  ownerSignature: one(signatures, {
    fields: [inspections.ownerSignatureId],
    references: [signatures.id],
  }),
  answers: many(inspectionAnswers),
  attachments: many(inspectionAttachments),
  certificates: many(certificates),
}))

// ─── Inspection Answers ───────────────────────────────────────
export const inspectionAnswersRelations = relations(inspectionAnswers, ({ one }) => ({
  inspection: one(inspections, {
    fields: [inspectionAnswers.inspectionId],
    references: [inspections.id],
  }),
}))

// ─── Inspection Attachments ───────────────────────────────────
export const inspectionAttachmentsRelations = relations(inspectionAttachments, ({ one }) => ({
  inspection: one(inspections, {
    fields: [inspectionAttachments.inspectionId],
    references: [inspections.id],
  }),
}))

// ─── Certificates ─────────────────────────────────────────────
export const certificatesRelations = relations(certificates, ({ one }) => ({
  inspection: one(inspections, {
    fields: [certificates.inspectionId],
    references: [inspections.id],
  }),
}))

// ─── Signatures ───────────────────────────────────────────────
export const signaturesRelations = relations(signatures, ({ many }) => ({
  inspections: many(inspections),
}))

// ─── Notifications ────────────────────────────────────────────
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))
