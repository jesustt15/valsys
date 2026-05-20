# Proposal: Remounting Flow — Validation Gate & Close Inspection

## Intent

Step 4 of the lifecycle (Re-mounting & Closing) has no dedicated UI. The current status updater lets any operator manually pick `finalizado` with zero validation — no check for resolved non-compliant items, no post-mount photos, no signature, no correlative number. This change adds a guarded close flow that enforces the business rules defined in the workflow.

## Scope

### In Scope
- **`closeInspectionAction` Server Action**: atomic transaction that validates prerequisites, generates `CERT-YYYY-NNNN` correlative, creates certificate row, updates inspection to `finalizado`
- **Validation gate**: non-compliant answers resolved, ≥1 post-mount photo, signature captured, status must be `en_planta`
- **Post-mount photo section**: new card on existing inspection detail page, filtered by `post_mount` category, with upload via existing `ExpedienteUploader`
- **Status transition guard**: replace free-select dropdown with guarded "Cerrar Inspección" button when `en_planta`; dropdown disabled for `finalizado`
- **Correlative auto-generation**: sequential counter per year, format `CERT-2026-0001`

### Out of Scope
- Separate `/remounting` route (use existing detail page)
- PDF certificate generation (correlative is stored; PDF comes from plant doc)
- Cylinder re-mounting UI (cylinders already tracked via recertification panel)

## Capabilities

### New Capabilities
- `inspection-close-flow`: Validation-gated close action with correlative auto-generation, status transition guard, and certificate creation in a single atomic operation

### Modified Capabilities
- `certificate-management`: Correlative number changes from manual input to auto-generated `CERT-YYYY-NNNN` format; certificate creation moves from standalone action to part of the close flow

## Approach

1. **Schema**: Add `correlative_number` column to `inspections` table (or generate at close time and store only in `certificates`). Since `certificates` already has `correlativeNumber`, generate it during close and insert the certificate row atomically.

2. **Server Action** (`closeInspectionAction`):
   - Verify session, inspection exists, status = `en_planta`
   - Query `inspection_answers` — reject if any `answer = false` (non-compliant unresolved)
   - Query `inspection_attachments` WHERE category = `post_mount` — reject if empty
   - Verify `owner_signature_id` is set — reject if null
   - Generate next correlative: `SELECT COUNT(*) FROM certificates WHERE correlative_number LIKE 'CERT-{year}-%'`, format as `CERT-YYYY-NNNN`
   - Begin transaction: insert certificate, update inspection status to `finalizado`, set `updatedAt`
   - Return success with correlative number

3. **UI changes on detail page** (`inspections/[id]/page.tsx`):
   - Add post-mount photo card (sidebar) filtering attachments by `post_mount`
   - Replace status dropdown with: when `en_planta`, show "Cerrar Inspección" button + validation summary; when other statuses, keep dropdown but remove `finalizado` option
   - If no signature exists when `en_planta`, show signature pad inline

4. **Correlative generator**: pure function using DB count + year, padded to 4 digits. No separate sequence table needed for current scale.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `front/lib/actions/inspection.ts` | Modified | Add `closeInspectionAction` with validation + atomic transaction |
| `front/db/schema.ts` | Modified | No changes needed — existing columns suffice |
| `front/app/(dashboard)/inspections/[id]/page.tsx` | Modified | Add post-mount card, replace status UI with close button |
| `front/components/inspections/inspection-status-updater.tsx` | Modified | Replace dropdown with guarded close button for `en_planta` |
| `front/components/inspections/close-inspection-button.tsx` | New | Client component for close flow with validation feedback |
| `front/lib/services/inspection.ts` | Modified | Add `getNonCompliantAnswers` and `getPostMountAttachments` helpers |
| `openspec/specs/certificate-management/spec.md` | Delta spec | Correlative auto-generation replaces manual input |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Race condition on correlative counter (two closes same second) | Medium | Use DB transaction with `SELECT ... FOR UPDATE` or unique constraint on `correlative_number` |
| Operator closes with false negatives (marked compliant but isn't) | Low | Business process risk, not technical — add confirmation dialog listing resolved items |
| Post-mount photos uploaded but in wrong category | Low | Filter strictly by `post_mount`; uploader already supports category param |
| Existing inspections in `finalizado` without certificate | Medium | Migration not needed — close flow is forward-only; legacy records remain as-is |

## Rollback Plan

1. Revert the `closeInspectionAction` and UI changes via git
2. Restore the original `InspectionStatusUpdater` dropdown with all status options
3. Any certificates created during the close flow remain valid — no data corruption
4. If correlative format needs adjustment, it's a pure function change — no data migration

## Dependencies

- Existing `ExpedienteUploader` component (reuse for post-mount uploads)
- Existing `SignaturePad` component (reuse if signature missing)
- MinIO storage (already configured)
- PostgreSQL (for atomic transaction + correlative counter)

## Success Criteria

- [ ] Inspection in `en_planta` cannot be closed without: all answers ≠ false, ≥1 post-mount photo, signature present
- [ ] Closing an inspection atomically creates a certificate with auto-generated `CERT-YYYY-NNNN`
- [ ] Post-mount photo section visible on detail page, filtered by category
- [ ] Status dropdown no longer offers `finalizado` as a free-select option
- [ ] Correlative numbers are unique and sequential per year
