# Proposal: Cylinder Recertification Workflow

## Intent

Cylinders with status `en_planta` have no dedicated recertification flow. The current `cylinder-manager` uses a generic status dropdown that conflates removal (desmontaje) with recertification outcomes. Operators must manually select status, serial, and date without validation — allowing invalid transitions (e.g., `montado` → `de_baja`) and missing required fields (`actualSerial`, `recalificationDate`) when recertifying.

## Scope

### In Scope
- New `recertifyCylinderAction` Server Action with validation: `actualSerial` + `recalificationDate` required when status → `pendiente_reinstalacion`
- Status transition guard: `en_planta` → `pendiente_reinstalacion` OR `de_baja` only
- `CylinderRecertificationPanel` component on inspection detail page listing `en_planta` cylinders
- Per-cylinder recertification form (status, serial, date) + plant document upload (PDF → MinIO, category `plant`)
- Progress indicator showing X/Y cylinders resolved (status ≠ `en_planta`)

### Out of Scope
- Changes to `certificates` table structure (uses existing `plantDocKey`)
- Bulk recertification (one-at-a-time only)
- Cylinder creation or removal flows (existing `cylinder-manager` unchanged)
- Changes to `cylinder-manager` edit form (deprecated by new panel)

## Capabilities

### New Capabilities
- `cylinder-recertification`: Dedicated recertification action, validation, UI panel, and plant document upload per cylinder on inspection detail page

### Modified Capabilities
- None

## Approach

1. **Validation layer**: New `recertifyCylinderSchema` with refinement — when `status === 'pendiente_reinstalacion'`, require `actualSerial` (non-empty) and `recalificationDate`. Reject transitions from non-`en_planta` statuses.
2. **Server Action**: `recertifyCylinderAction` — validates, updates `gncCylinders` (status + serial + date + audit fields), optionally uploads plant document to MinIO under `inspections/{id}/plant/{cylinderId}/`, inserts `inspectionAttachments` row with category `plant`.
3. **Service layer**: `getCylindersByInspectionId` — joins cylinders filtered by vehicle linked to inspection, ordered by status priority (`en_planta` first).
4. **UI**: `CylinderRecertificationPanel` — client component rendered on inspection detail page. Shows progress bar (resolved/total), lists each `en_planta` cylinder with inline form. Resolved cylinders shown collapsed with summary badge.
5. **Page integration**: Add panel between `CylinderManager` and checklist on `inspections/[id]/page.tsx`. Only render when inspection status is `en_planta` or beyond.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `front/lib/validations/cylinder.ts` | Modified | Add `recertifyCylinderSchema` with conditional required fields |
| `front/lib/actions/cylinder.ts` | Modified | Add `recertifyCylinderAction` Server Action |
| `front/lib/services/cylinder.ts` | Modified | Add `getCylindersByInspectionId` |
| `front/components/cylinders/cylinder-recertification-panel.tsx` | New | Recertification panel with progress, forms, file upload |
| `front/app/(dashboard)/inspections/[id]/page.tsx` | Modified | Import and render new panel |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `cylinder-manager` edit form still allows invalid transitions | Medium | Add status transition guard to existing `updateCylinderStatusSchema` as well, or deprecate edit form for `en_planta` cylinders |
| Plant document upload per cylinder creates many MinIO objects | Low | Key structure includes cylinderId for traceability; existing `plant` category already defined |
| Progress indicator stale if cylinder added after page load | Low | Server-side data fetch; revalidatePath on action success |
| Review workload exceeds 400-line budget | Medium | Split into 2 PRs: (1) action + validation + service, (2) UI panel + page integration |

## Rollback Plan

Revert the change commit. The new `recertifyCylinderAction` and panel are additive — no existing behavior is modified except the optional status guard on `updateCylinderStatusSchema`. If the guard is added, remove it in rollback to restore the previous permissive behavior.

## Dependencies

- Existing MinIO `putObject` utility
- Existing `attachmentCategory` enum already includes `plant`
- Existing `cylinderStatus` enum already includes all needed statuses

## Success Criteria

- [ ] Recertifying a cylinder without `actualSerial` or `recalificationDate` returns validation error
- [ ] Attempting to transition from `montado` to `de_baja` directly is rejected
- [ ] Panel on inspection detail shows only `en_planta` cylinders with recertification forms
- [ ] Plant document upload stores file in MinIO with `plant` category attachment
- [ ] Progress indicator correctly shows X/Y resolved count
- [ ] After recertification, cylinder status updates and panel reflects change
