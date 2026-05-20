# Design: Cylinder Recertification Workflow

## Technical Approach

Add a dedicated recertification flow for `en_planta` cylinders on the inspection detail page. The change is additive: a new Server Action (`recertifyCylinderAction`) with Zod refinement validation, a new service function (`getCylindersByInspectionId`), a new client component (`CylinderRecertificationPanel`), and a guard on the existing `updateCylinderStatusAction` to prevent invalid transitions from `en_planta`. The panel coexists alongside the existing `CylinderManager` — the manager handles creation and general editing; the panel handles the specific recertification decision.

Maps to spec requirements: Recertification Server Action (R1), Status Transition Validation (R2), Recertification Panel UI (R3), Progress Indicator (R4), Cylinders by Inspection Service (R5).

## Architecture Decisions

| Decision | Options | Tradeoff | Decision |
|----------|---------|----------|----------|
| Validation strategy | Zod refinement vs manual if-checks | Refinements give structured error messages; manual is simpler but harder to test | **Zod refinement** — `recertifyCylinderSchema.superRefine()` for conditional required fields |
| Status guard location | Guard in schema vs guard in action body | Schema guard catches it early with clear error; action body allows DB-level check too | **Both** — schema rejects invalid target statuses; action re-checks current status in DB before update (defense in depth) |
| Panel placement | Replace CylinderManager edit form vs coexist as separate component | Replacement is cleaner but riskier; coexistence is safer migration path | **Coexist** — render panel between CylinderManager and Checklist; CylinderManager edit form gets a guard to block `en_planta` transitions |
| Progress state | Client-side counter vs server-side re-fetch | Client counter is instant but stale on concurrent edits; server is authoritative | **Server-side via `revalidatePath`** — progress recalculated on each render; client shows optimistic update |
| Plant document key structure | `inspections/{id}/plant/{cylinderId}/{timestamp}.pdf` vs flat | Hierarchical is traceable; flat is simpler | **Hierarchical** — matches existing `updateCylinderStatusAction` pattern for photos |

## Data Flow

```
Inspection Detail Page (RSC)
  │
  ├─ getCylindersByInspectionId(inspectionId)
  │     └─ SELECT from gnc_cylinders WHERE vehicle_id = (SELECT vehicle_id FROM inspections WHERE id = ?)
  │        ORDER BY CASE status WHEN 'en_planta' THEN 0 ELSE 1 END
  │
  ├─ CylinderManager (existing) — shows all cylinders in table
  │
  └─ CylinderRecertificationPanel (new client component)
        │
        ├─ Progress bar: resolved = cylinders.filter(c => c.status !== 'en_planta').length
        │                total = cylinders.filter(c => originalStatus === 'en_planta').length
        │
        └─ Per-cylinder form → recertifyCylinderAction(formData)
              │
              ├─ 1. getSession() → reject if null
              ├─ 2. Zod parse recertifyCylinderSchema
              ├─ 3. DB read: SELECT status FROM gnc_cylinders WHERE id = ?
              ├─ 4. Guard: reject if current status !== 'en_planta'
              ├─ 5. DB update: gnc_cylinders SET status, actualSerial, recalificationDate, updatedBy, updatedAt
              ├─ 6. If plantDoc present: putObject() → MinIO
              ├─ 7. INSERT inspectionAttachments (category: 'plant')
              └─ 8. revalidatePath(`/inspections/${inspectionId}`)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `front/lib/validations/cylinder.ts` | Modify | Add `recertifyCylinderSchema` with `superRefine` for conditional required fields and allowed target statuses |
| `front/lib/actions/cylinder.ts` | Modify | Add `recertifyCylinderAction`; add status guard to `updateCylinderStatusAction` blocking `en_planta` → non-allowed transitions |
| `front/lib/services/cylinder.ts` | Modify | Add `getCylindersByInspectionId` — joins inspections→vehicles→cylinders with status-priority ordering |
| `front/components/cylinders/cylinder-recertification-panel.tsx` | Create | Client component: progress bar, per-cylinder recertification forms, collapsed resolved cylinders, PDF upload |
| `front/app/(dashboard)/inspections/[id]/page.tsx` | Modify | Import `getCylindersByInspectionId`, call it, pass cylinders to new panel; render panel only when inspection status ≥ `en_planta` and `en_planta` cylinders exist |

## Interfaces / Contracts

### Recertification Schema

```typescript
export const recertifyCylinderSchema = z.object({
  id: z.string().uuid(),
  inspectionId: z.string().uuid(),
  status: z.enum(['pendiente_reinstalacion', 'de_baja']),
  actualSerial: z.string().optional(),
  recalificationDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'pendiente_reinstalacion') {
    if (!data.actualSerial || data.actualSerial.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El número de serie actual es obligatorio para recertificación', path: ['actualSerial'] })
    }
    if (!data.recalificationDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La fecha de recalificación es obligatoria para recertificación', path: ['recalificationDate'] })
    }
  }
})
```

### Service Function

```typescript
export async function getCylindersByInspectionId(inspectionId: string) {
  // Subquery: get vehicleId from inspection, then select cylinders ordered with en_planta first
}
```

### Panel Props

```typescript
interface CylinderRecertificationPanelProps {
  inspectionId: string
  cylinders: Array<{
    id: string; brand: string; capacity: string; initialSerial: string;
    actualSerial: string | null; status: string; recalificationDate: string | null;
  }>
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `recertifyCylinderSchema` validation cases (missing serial, missing date, invalid status) | Vitest with `safeParse` assertions |
| Unit | Status guard in `updateCylinderStatusAction` rejects `en_planta` → `montado` | Vitest mock DB |
| Integration | `recertifyCylinderAction` full flow: valid recertification updates DB + uploads to MinIO | Test with Docker Compose infra (PostgreSQL + MinIO) |
| Integration | `getCylindersByInspectionId` returns correct ordering with mixed statuses | Drizzle test against test DB |
| E2E | Panel renders, form submits, progress updates, resolved cylinders collapse | Playwright on inspection detail page |

## Migration / Rollout

No migration required. All changes are additive — no schema changes, no data migration. The guard on `updateCylinderStatusAction` is a behavioral tightening but only blocks transitions that should never have been allowed (en_planta → montado directly).

## Open Questions

- [ ] Should the `CylinderManager` edit form be hidden entirely for `en_planta` cylinders, or just guarded? (Proposed: guard only — keeps the form for non-en_planta edits)
- [ ] Is PDF-only restriction for plant documents acceptable, or should images also be allowed? (Spec says PDF only)
