# Tasks: Cylinder Recertification Workflow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350–450 (5 files: 1 new, 4 modified) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend: validation + action + service) → PR 2 (frontend: panel + page wiring) |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Validation schema + recertifyCylinderAction + getCylindersByInspectionId + status guard | PR 1 | Backend only; testable in isolation; no UI changes |
| 2 | CylinderRecertificationPanel + page.tsx integration | PR 2 | Frontend only; depends on PR 1 action + service |

## Phase 1: Validation Layer

- [x] 1.1 Add `recertifyCylinderSchema` to `front/lib/validations/cylinder.ts` with `z.object({ id, inspectionId, status, actualSerial, recalificationDate })` and `superRefine` requiring `actualSerial` + `recalificationDate` when `status === 'pendiente_reinstalacion'` (spec R1 scenarios 3, 4; R2 scenario 3)
- [x] 1.2 Extend `updateCylinderStatusSchema` enum to include `'en_planta'` if not already present, and add a `superRefine` that rejects `en_planta` → non-allowed transitions (only `pendiente_reinstalacion` and `de_baja` allowed) (spec R2 scenario 3)

## Phase 2: Server Action

- [x] 2.1 Create `recertifyCylinderAction` in `front/lib/actions/cylinder.ts`: session guard → Zod parse → DB read current status → reject if not `en_planta` → update cylinder (status, actualSerial, recalificationDate, updatedBy, updatedAt) → revalidatePath (spec R1 scenarios 1, 2, 5, 6)
- [x] 2.2 Add plant document upload to `recertifyCylinderAction`: validate PDF-only → `putObject()` to `inspections/{inspectionId}/plant/{cylinderId}/{timestamp}.pdf` → insert `inspectionAttachments` row with category `plant` (spec R1 scenarios 1, 7)
- [x] 2.3 Add status guard to `updateCylinderStatusAction`: if current cylinder status is `en_planta`, reject transitions to anything other than `pendiente_reinstalacion` or `de_baja` (spec R2 scenario 3)

## Phase 3: Service Layer

- [x] 3.1 Add `getCylindersByInspectionId(inspectionId)` to `front/lib/services/cylinder.ts`: subquery to get `vehicleId` from inspection, then select from `gncCylinders` with `ORDER BY CASE WHEN status = 'en_planta' THEN 0 ELSE 1 END` (spec R5 scenarios 1, 2, 3)

## Phase 4: UI Component

- [x] 4.1 Create `front/components/cylinders/cylinder-recertification-panel.tsx` client component: receives `inspectionId` + cylinders array; renders progress bar (X/Y resolved), per-cylinder forms with status select/serial input/date input/PDF upload, collapsed view for resolved cylinders with status badge (spec R3 scenarios 1, 2; R4 scenarios 1, 2, 3)
- [x] 4.2 Wire each cylinder form to `recertifyCylinderAction` via `useActionState` with FormData; handle pending/error/success states with framer-motion animations (matching CylinderManager patterns)

## Phase 5: Page Integration

- [x] 5.1 Modify `front/app/(dashboard)/inspections/[id]/page.tsx`: import `getCylindersByInspectionId`, call it with `resolvedParams.id`, pass result to new panel (spec R5)
- [x] 5.2 Render `CylinderRecertificationPanel` between `CylinderManager` and Checklist; only when inspection status ≥ `en_planta` AND at least one cylinder has `en_planta` status (spec R3 scenarios 3, 4)
- [x] 5.3 Add guard to `CylinderManager` edit form to prevent status changes for `en_planta` cylinders (hide status field or show read-only badge directing to recertification panel)

## Phase 6: Testing

- [ ] 6.1 Unit test `recertifyCylinderSchema`: valid recertification passes, missing serial fails, missing date fails, de_baja skips required fields, invalid status enum rejected
- [ ] 6.2 Unit test status guard in `updateCylinderStatusAction`: en_planta → montado rejected, en_planta → de_baja allowed
- [ ] 6.3 Integration test `getCylindersByInspectionId`: returns correct cylinders, en_planta ordered first, empty array for no cylinders
- [ ] 6.4 Verify panel renders correctly with 0, 1, and 3 en_planta cylinders; progress counter accurate; resolved cylinders collapsed

> **Phase 6 BLOCKED**: No test runner (vitest/jest) installed in project. Test files cannot be executed. Requires test infrastructure setup before these tasks can be completed.
