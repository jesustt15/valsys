# Design: Remounting Flow — Validation Gate & Close Inspection

## Technical Approach

Add a guarded close flow that replaces the free-select status dropdown when an inspection is `en_planta`. A new `closeInspectionAction` Server Action performs prerequisite validation (non-compliant answers, post-mount photos, signature), generates a `CERT-YYYY-NNNN` correlative, and atomically creates a certificate row + updates the inspection to `finalizado`. The existing `updateInspectionStatusAction` gains a guard that rejects `finalizado` — forcing all closes through the new flow. The inspection detail page gets a dedicated PostMountPhotos card and a `CloseInspectionButton` component that surfaces validation results before submission.

## Architecture Decisions

| Decision | Option A | Option B | Decision |
|----------|----------|----------|----------|
| Correlative generation | `SELECT MAX()` + increment | Separate sequence table | **A** — current scale (~hundreds/yr) doesn't need a sequence table; add unique constraint on `correlative_number` as race-condition safety |
| Where to store correlative | `inspections.correlative_number` column | `certificates.correlative_number` only | **B** — already exists in `certificates`; no schema change needed |
| Validation location | Server Action only | Client + Server | **Server-only** for truth; client shows preview of what will fail (optimistic UX) but server is the gate |
| Post-mount photo section | New dedicated card on sidebar | Merge into existing gallery card | **New card** — clear visual separation, filtered by `post_mount` category |
| Status UI replacement | Conditional render (dropdown vs button) | Always dropdown, disable `finalizado` | **Conditional** — when `en_planta`, show close button + validation summary; otherwise dropdown without `finalizado` |

## Data Flow

```
Client: CloseInspectionButton
  │
  │  POST (Server Action)
  ▼
closeInspectionAction
  │
  ├── 1. getSession() → reject if unauthenticated
  ├── 2. SELECT inspection WHERE id = ? → reject if not en_planta
  ├── 3. SELECT * FROM inspection_answers WHERE inspectionId = ? AND answer = false
  │       → reject if any non-compliant unresolved
  ├── 4. SELECT COUNT(*) FROM inspection_attachments WHERE category = 'post_mount'
  │       → reject if 0
  ├── 5. SELECT owner_signature_id FROM inspections → reject if null
  ├── 6. SELECT COUNT(*) FROM certificates WHERE correlative_number LIKE 'CERT-{year}-%'
  │       → format CERT-YYYY-NNNN (padded 4 digits)
  ├── 7. BEGIN TRANSACTION
  │       ├── INSERT INTO certificates (inspectionId, correlativeNumber, issueDate)
  │       ├── UPDATE inspections SET status = 'finalizado', updatedAt = now()
  │       └── COMMIT
  └── 8. revalidatePath(`/inspections/${id}`)
       → return { success: true, data: { correlativeNumber } }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/actions/inspection.ts` | Modify | Add `closeInspectionAction` (validation + atomic close); modify `updateInspectionStatusAction` to reject `finalizado` |
| `lib/services/inspection.ts` | Modify | Add `getNonCompliantAnswers(inspectionId)` and `getPostMountAttachments(inspectionId)` query helpers |
| `lib/validations/inspection.ts` | Modify | Add `closeInspectionSchema` Zod schema for input validation |
| `components/inspections/inspection-status-updater.tsx` | Modify | Conditional render: when `en_planta` show `CloseInspectionButton`; dropdown excludes `finalizado` |
| `components/inspections/close-inspection-button.tsx` | Create | Client component: triggers `closeInspectionAction`, shows validation summary, displays correlative on success |
| `components/inspections/post-mount-photos.tsx` | Create | Sidebar card: lists `post_mount` attachments with presigned URLs, embeds `ExpedienteUploader` scoped to `post_mount` |
| `app/(dashboard)/inspections/[id]/page.tsx` | Modify | Pass `post_mount` filtered attachments to new card; replace `InspectionStatusUpdater` usage with updated props |
| `db/schema.ts` | No change | Existing columns suffice — `certificates.correlative_number` already exists with unique constraint |

## Interfaces / Contracts

### closeInspectionAction

```ts
export type CloseInspectionFormState = {
  success?: boolean
  error?: string
  data?: { correlativeNumber: string }
  validationErrors?: {
    nonCompliantCount?: number
    hasPostMountPhotos?: boolean
    hasSignature?: boolean
  }
}

export async function closeInspectionAction(
  _prev: CloseInspectionFormState | null,
  formData: FormData,
): Promise<CloseInspectionFormState>
```

### updateInspectionStatusAction (modified)

```ts
// Reject if status === 'finalizado' — must use closeInspectionAction instead
// Error: "No se puede establecer 'finalizado' manualmente. Use el botón Cerrar Inspección."
```

### Service helpers

```ts
export async function getNonCompliantAnswers(inspectionId: string): Promise<{
  id: string
  questionKey: string
  section: string
  observations: string | null
}[]>

export async function getPostMountAttachments(inspectionId: string): Promise<{
  id: string
  fileName: string
  minioKey: string
  fileType: string
  createdAt: Date | null
}[]>
```

### Correlative generator (pure function)

```ts
export function generateCorrelativeNumber(count: number, year: number): string {
  return `CERT-${year}-${String(count + 1).padStart(4, '0')}`
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `generateCorrelativeNumber` output format | Jest — verify `CERT-2026-0001`, `CERT-2026-0042`, year rollover |
| Unit | Zod `closeInspectionSchema` rejects invalid inspectionId | Jest — empty string, non-UUID |
| Integration | `closeInspectionAction` rejects when non-compliant answers exist | Mock DB with `answer = false` rows |
| Integration | `closeInspectionAction` rejects when no post-mount photos | Mock empty attachments |
| Integration | `closeInspectionAction` rejects when no signature | Mock `ownerSignatureId = null` |
| Integration | `closeInspectionAction` succeeds — certificate created, status updated | Full DB transaction test with testcontainers |
| Integration | `updateInspectionStatusAction` rejects `finalizado` | Call action with `finalizado`, verify error |
| E2E | Full close flow: upload post-mount photos → capture signature → close → verify correlative | Playwright — fill inspection, upload, sign, click close, assert success |

## Migration / Rollout Plan

No migration needed. The `certificates.correlative_number` column already exists with a unique constraint. The change is forward-only:

1. Deploy `closeInspectionAction` + UI changes
2. Existing `finalizado` inspections remain untouched (no certificate = legacy data)
3. New closes auto-generate correlatives and create certificate rows
4. If correlative format needs adjustment later, it's a pure function change — no data migration

## Open Questions

- [ ] Should the close confirmation dialog list the resolved non-compliant items for operator review? (Proposal: yes, shows count + question keys)
- [ ] Should `createCertificateAction` remain available as a standalone action for legacy inspections that were `finalizado` before this change? (Proposal: yes, keep it for `finalizado` inspections without certificates)
