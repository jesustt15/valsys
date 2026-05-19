# Proposal: Inspection Forms & Tables

## Intent

The valsys system has a defined schema for inspections (checklist answers, photo attachments) but no UI to actually perform inspections. Operators cannot start inspections, fill checklists, or upload photos. Additionally, there are no list pages for owners or inspections — only creation forms exist. This proposal builds the core inspection workflow and missing list pages.

## Scope

### In Scope
- Multi-step inspection checklist form at `/inspections/new` (Front/Rear sections, Sí/No/Pendiente + observations)
- Photo upload to MinIO during inspection phases (initial, removal, post-mount)
- Owners list page at `/owners` with search
- Inspections list page at `/inspections` with status filter
- Services layer: `getInspections()`, `getOwners()`, `createInspection()`, `saveInspectionAnswers()`, `uploadInspectionPhoto()`
- Validation schemas for inspection data

### Out of Scope
- Cylinder management UI (dismount/remount workflow)
- Certificate generation and download
- Owner/vehicle edit pages
- Signature capture (canvas → MinIO)
- Public certificate retrieval route

## Capabilities

### New Capabilities
- `inspection-checklist`: Multi-step form with sectioned yes/no/pending questions, observations, and forward/back navigation
- `inspection-photos`: Photo upload to MinIO with category tagging (initial/removal/post_mount)
- `inspection-listing`: Paginated/filterable inspection list with status and vehicle info
- `owner-listing`: Searchable owner list with link to create new

### Modified Capabilities
- None

## Approach

**Multi-step form**: Single `'use client'` component with client-side `step` state (not `useActionState`). All 20 questions rendered across 3 steps (vehicle info → Front → Rear). Forward/back buttons navigate steps. Final "Guardar" submits entire form via one Server Action. Native `formData.get()` reads all inputs — no controlled components.

**Photo upload**: `<input type="file" multiple accept="image/*">` per step. Server Action receives `FormData`, extracts `File` objects, calls existing `putObject()` with key pattern `inspections/{inspectionId}/{category}/{uuid}-{filename}`, then inserts `inspection_attachments` rows.

**Table pages**: Server page fetches data → passes to Client table component → `useState` + `useMemo` for search/filter. Follows existing `UsersTable` pattern exactly.

**Services layer**: New `lib/services/inspection.ts` with `getInspections()`, `createInspection()`, `saveInspectionAnswers()`, `uploadInspectionPhoto()`. New `lib/services/owner.ts` with `getAllOwners()`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `front/lib/validations/inspection.ts` | New | Zod schemas for inspection creation and answers |
| `front/lib/actions/inspection.ts` | New | Server Actions: `createInspection`, `saveAnswers`, `uploadPhoto` |
| `front/lib/services/inspection.ts` | New | DB queries for inspections, answers, attachments |
| `front/lib/services/owner.ts` | New | `getAllOwners()` query |
| `front/app/(dashboard)/inspections/page.tsx` | New | Inspections list page (server) |
| `front/app/(dashboard)/inspections/new/page.tsx` | New | New inspection page (server) |
| `front/app/(dashboard)/owners/page.tsx` | New | Owners list page (server) |
| `front/components/inspection/inspection-form.tsx` | New | Multi-step form client component |
| `front/components/inspection/photo-upload.tsx` | New | Photo upload client component |
| `front/components/inspection/inspection-table.tsx` | New | Inspections table client component |
| `front/components/owners/owners-table.tsx` | New | Owners table client component |
| `front/components/sidebar.tsx` | Modify | Add "Inspecciones" and "Dueños" nav links |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| MinIO not running during dev | Medium | `ensureBucket()` already handles bucket creation; graceful error on upload |
| Large photo payloads timeout Server Actions | Medium | Client-side size validation (5MB max per file), limit to 10 files |
| Form state lost on navigation | Low | Client-side step state persists until submit or page refresh |
| `km_current` NOT NULL constraint | Low | First step requires km input before proceeding to checklist |

## Rollback Plan

Delete the change directory and revert `sidebar.tsx`. No schema changes or migrations required — all tables already exist. If MinIO uploads created orphan files, they can be cleaned via MinIO console using the `inspections/` prefix.

## Dependencies

- MinIO running (`docker compose up -d`)
- Existing `putObject()` and `ensureBucket()` in `lib/minio/index.ts`
- Existing `inspection_answers`, `inspection_attachments`, `inspections` tables in schema

## Success Criteria

- [ ] Operator can create inspection with vehicle selection, km, and complete 20-question checklist
- [ ] Photos upload to MinIO and appear in `inspection_attachments` with correct category
- [ ] `/inspections` shows all inspections with status badges and vehicle info
- [ ] `/owners` shows all owners with working search
- [ ] All forms use existing patterns: `useActionState` + Zod + native inputs

## Size Estimate

~800–1000 lines of new code across 12 files. Review budget: may exceed 400-line single PR limit. Recommend 2 PRs: (1) services + validation + actions, (2) UI components + routes.
