---
name: valsys-drizzle
description: "Trigger: drizzle, schema, migration, query, database, db, pg, postgres. Design Drizzle ORM schemas, run migrations, and write type-safe queries for PostgreSQL."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# valsys-drizzle — Drizzle ORM Patterns

## Activation Contract

Use this skill when creating or modifying database schemas, running migrations, or writing database queries.

## Hard Rules

1. **Schema in `lib/db/schema.ts`**: all tables defined in one file, ordered by dependency (referenced tables first).

2. **Naming**: snake_case for columns, `pgTable('table_name', ...) `, don't pluralize table names.

3. **UUIDs**: `id: uuid('id').primaryKey().defaultRandom()` everywhere — no auto-increment.

4. **Timestamps**: `createdAt: timestamp('created_at').defaultNow()` and `updatedAt: timestamp('updated_at').defaultNow()` on EVERY table. Use a `@tm` trigger or handle `updated_at` in the application layer.

5. **Indexes**: add indexes on all FK columns + any searchable column (`license_plate`, `vin`, `document_id`, `correlative_number`).

6. **JSONB** for flexible vehicle attributes (`specific_attributes`). Zod validates the shape at the application layer.

7. **Relations**: use Drizzle's `relations` API for type-safe joins. Define in a separate `relations.ts` file.

8. **Migrations**: `drizzle-kit generate` + `drizzle-kit migrate`. Never hand-edit migration files.

## Query Patterns

```ts
// SELECT with relations
const inspection = await db.query.inspections.findFirst({
  where: eq(inspections.id, id),
  with: {
    vehicle: true,
    attachments: true,
  }
})

// INSERT and return
const [owner] = await db.insert(owners).values(data).returning()

// Full-text search (via Meilisearch, not PostgreSQL)
// Use Meilisearch SDK, then fetch full records from PG by IDs
```
