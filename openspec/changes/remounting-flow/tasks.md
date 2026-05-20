# Tasks: Remounting Flow — Validation Gate & Close Inspection

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350-450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (foundation) → PR 2 (UI wiring) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Service helpers, correlative generator, closeInspectionAction, status guard | PR 1 | Backend foundation — testable in isolation |
| 2 | PostMountPhotos component, CloseInspectionButton, page wiring | PR 2 | UI layer — depends on PR 1 actions |

## Phase 1: Foundation — Service Layer & Server Actions

- [ ] 1.1 Add `getNonCompliantAnswers(inspectionId)` to `front/lib/services/inspection.ts` — returns `{ id, questionKey, section, observations }[]` for rows where `answer = false`
- [ ] 1.2 Add `getPostMountAttachments(inspectionId)` to `front/lib/services/inspection.ts` — returns `{ id, fileName, minioKey, fileType, createdAt }[]` filtered by `category = 'post_mount'`
- [ ] 1.3 Add `countCertificatesByYear(year)` to `front/lib/services/certificate.ts` — returns `COUNT(*)` for `correlative_number LIKE 'CERT-{year}-%'`
- [ ] 1.4 Create `front/lib/utils/generate-correlative.ts` — pure function `generateCorrelativeNumber(count: number, year: number): string` returning `CERT-YYYY-NNNN` format
- [ ] 1.5 Add `closeInspectionSchema` to `front/lib/validations/inspection.ts` — Zod schema validating `inspectionId` as UUID
- [ ] 1.6 Add `closeInspectionAction` to `front/lib/actions/inspection.ts` — Server Action: session check → status guard → non-compliant check → post-mount photos check → signature check → certificate-exists check → generate correlative → BEGIN TX → INSERT certificate → UPDATE inspection status → COMMIT → revalidatePath → return `{ success, data: { correlativeNumber } }`
- [ ] 1.7 Modify `updateInspectionStatusAction` in `front/lib/actions/inspection.ts` — reject if `status === 'finalizado'` with error "No se puede establecer 'finalizado' manualmente. Use el botón Cerrar Inspección."

## Phase 2: UI Components & Page Wiring

- [ ] 2.1 Create `front/components/inspections/post-mount-photos.tsx` — Card component: lists existing `post_mount` attachments with presigned URLs, embeds `ExpedienteUploader` scoped to `post_mount` category, conditionally rendered only when `status === 'en_planta'`
- [ ] 2.2 Create `front/components/inspections/close-inspection-button.tsx` — Client component: form with hidden `inspectionId`, triggers `closeInspectionAction` via `useActionState`, shows loading state, displays error messages, shows success with correlative number
- [ ] 2.3 Modify `front/components/inspections/inspection-status-updater.tsx` — conditional render: when `currentStatus === 'en_planta'`, render `CloseInspectionButton` instead of dropdown; dropdown options exclude `finalizado`
- [ ] 2.4 Modify `front/app/(dashboard)/inspections/[id]/page.tsx` — filter `attachmentsWithUrls` to exclude `post_mount` from main gallery, add `PostMountPhotos` card in sidebar (before CertificateCard), pass `status` prop for conditional rendering

## Phase 3: Testing

- [ ] 3.1 Write unit tests for `generateCorrelativeNumber` — verify `CERT-2026-0001` (first), `CERT-2026-0042` (subsequent), `CERT-2027-0001` (year rollover)
- [ ] 3.2 Write unit tests for `closeInspectionSchema` — reject empty string, reject non-UUID, accept valid UUID
- [ ] 3.3 Write integration test: `closeInspectionAction` rejects when inspection status is not `en_planta`
- [ ] 3.4 Write integration test: `closeInspectionAction` rejects when non-compliant answers exist without resolution
- [ ] 3.5 Write integration test: `closeInspectionAction` rejects when no `post_mount` attachments exist
- [ ] 3.6 Write integration test: `closeInspectionAction` rejects when no signature exists
- [ ] 3.7 Write integration test: `closeInspectionAction` rejects when certificate already exists for inspection
- [ ] 3.8 Write integration test: `closeInspectionAction` succeeds — certificate created with correct correlative, inspection status updated to `finalizado`
- [ ] 3.9 Write integration test: `updateInspectionStatusAction` rejects `finalizado` status with correct error message

## Phase 4: Verification & Cleanup

- [ ] 4.1 Run `sdd-verify` against all 14 spec scenarios (12 Inspection Workflow + 2 Certificate Management)
- [ ] 4.2 Verify no `finalizado` can be set via dropdown — only through close button
- [ ] 4.3 Verify post-mount photos section is hidden for `inspeccion_inicial` and `finalizado` statuses
- [ ] 4.4 Verify transaction rollback behavior — if certificate insert fails, inspection status remains `en_planta`
