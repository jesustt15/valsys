---
name: valsys-architecture
description: "Trigger: architecture, estructura, carpetas, folder structure, clean architecture, hexagonal. Follow clean architecture layers with strict dependency rules in the valsys monorepo."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

# valsys-architecture — Monorepo Structure & Clean Architecture

## Activation Contract

Follow these rules when creating new files, organizing code, or deciding where logic belongs.

## Hard Rules

1. **Layer dependencies**: `presentation → application → domain` ONLY. `domain` never imports from `application` or `presentation`. `infrastructure` implements `application` interfaces.

2. **In the `front/` (Next.js)**:
   - `app/` = routes + page components ONLY. No logic here.
   - `components/` = UI components (atomic design: atoms → molecules → organisms → templates)
   - `lib/actions/` = Server Actions (thin — validates, calls service, returns result)
   - `lib/services/` = business logic
   - `lib/db/` = Drizzle schema + queries
   - `lib/minio/` = MinIO client
   - `lib/meilisearch/` = Meilisearch client
   - `lib/validations/` = Zod schemas

3. **In `packages/`**:
   - `packages/domain/` = pure types, Zod schemas, business rules. Zero dependencies on Next.js, DB, or MinIO.
   - `packages/ui/` = shared React components used across apps (if we add more apps later)

4. **Server Actions are THIN**: validate → call service → return result. No business logic in actions.

5. **Routes define layout/page structure only**: `app/(dashboard)/inspections/new/page.tsx` = just assembles components. No data fetching in page components — use `lib/services/`.

## Folder Reference

```
front/
├── app/
│   ├── (auth)/              # login, register
│   ├── (dashboard)/          # inspections, vehicles, owners
│   └── public/               # external cert lookup (by plate)
├── components/
│   ├── ui/                   # atoms: Button, Input, Label
│   ├── forms/                # molecule: OwnerForm, VehicleForm
│   └── templates/            # organisms: InspectionChecklist
├── lib/
│   ├── actions/              # Server Actions
│   ├── services/             # business logic
│   ├── db/                   # schema.ts + migrations
│   ├── minio/                # MinIO client wrapper
│   ├── meilisearch/          # Meilisearch client wrapper
│   └── validations/          # Zod schemas
```
