# Proposal: Certificate Management

## Intent

The `certificates` table exists in the schema with zero application code. Operators cannot upload plant recertification documents, generate final certificates with correlative numbers, or track certificate issuance from the inspection detail page. This change wires up the full certificate lifecycle: upload plant PDF → generate correlative → create certificate record → display on inspection expediente.

## Scope

### In Scope
- Certificate service layer (`lib/services/certificate.ts`): `getCertificateByInspectionId`, `getNextCorrelativeNumber`
- Server Action (`lib/actions/certificate.ts`): `createCertificateAction` — uploads plant PDF + final cert PDF to MinIO, generates correlative, inserts record
- Correlative number generator: `CERT-YYYY-NNNN` format (year + zero-padded sequential, atomic via DB)
- UI section on inspection detail page (`inspections/[id]/page.tsx`): upload plant PDF, upload final certificate PDF, display existing certificate info
- Validation schema (`lib/validations/certificate.ts`)

### Out of Scope
- Separate `/certificates` listing route
- Public certificate download page (workflow step 5)
- Certificate PDF template generation (assumes operator uploads a pre-generated PDF)
- Certificate edit/delete

## Capabilities

### New Capabilities
- `certificate-management`: Create certificate with auto-generated correlative number, upload plant document and final certificate PDF to MinIO, view certificate status on inspection detail page

### Modified Capabilities
- None

## Approach

**Service layer**: `getCertificateByInspectionId` queries `certificates` by `inspectionId`. `getNextCorrelativeNumber` reads the max `correlativeNumber` for the current year, parses the sequence, increments, and returns `CERT-YYYY-NNNN`. Uses a DB transaction with `FOR UPDATE`-style locking via Drizzle's `sql` raw query to prevent race conditions.

**Server Action**: Follows existing pattern — `'use server'`, session check, FormData input, Zod validation. Accepts `inspectionId`, `plantDoc` (File), `finalCert` (File). Uploads both to MinIO under `certificates/{inspectionId}/plant/` and `certificates/{inspectionId}/final/`. Calls `getNextCorrelativeNumber` inside a transaction, inserts the certificate row, updates inspection status to `finalizado`. Returns `{ success, data: { correlativeNumber } }`.

**Correlative format**: `CERT-2026-0001`. Sequential per calendar year. Query: `SELECT MAX(correlative_number) FROM certificates WHERE correlative_number LIKE 'CERT-2026-%'`. Parse last 4 digits, increment, zero-pad to 4.

**UI**: Add a "Certificado" card to the inspection detail page sidebar (below the photo gallery). Shows current certificate status (none/pending/issued). Two file inputs for plant PDF and final cert PDF. Submit button triggers the Server Action via `useActionState`. On success, displays the correlative number.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `front/lib/services/certificate.ts` | New | `getCertificateByInspectionId`, `getNextCorrelativeNumber` |
| `front/lib/actions/certificate.ts` | New | `createCertificateAction` Server Action |
| `front/lib/validations/certificate.ts` | New | Zod schema for certificate creation |
| `front/app/(dashboard)/inspections/[id]/page.tsx` | Modify | Add certificate card to sidebar |
| `front/components/certificates/certificate-uploader.tsx` | New | Client component with `useActionState` form |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Race condition on correlative generation | Medium | Use DB transaction with raw `SELECT ... FOR UPDATE` or serializable isolation |
| MinIO not running during dev | Medium | Reuse existing `ensureBucket()` pattern; graceful error handling |
| Large PDF payloads exceed Server Action limits | Low | Client-side validation (10MB max), same pattern as photo upload |
| Correlative gap if transaction fails after number reserved | Low | Acceptable — gaps are normal in sequential systems; number is only assigned on successful insert |

## Rollback Plan

Delete the change directory and revert `page.tsx`. No schema changes or migrations required — `certificates` table already exists. If MinIO uploads created orphan files, clean via MinIO console using the `certificates/` prefix. Any inserted certificate rows can be deleted by `inspectionId`.

## Dependencies

- MinIO running (`docker compose up -d`)
- Existing `putObject()` in `lib/minio/index.ts`
- Existing `certificates` table in schema (already migrated)
- Inspection must be in `en_planta` or `finalizado` status to create certificate

## Success Criteria

- [ ] `getNextCorrelativeNumber` returns correct `CERT-YYYY-NNNN` format, increments sequentially per year
- [ ] `createCertificateAction` uploads both files to MinIO, creates certificate row, returns correlative
- [ ] Inspection detail page shows certificate card with upload form and existing certificate info
- [ ] Correlative generation is safe under concurrent requests (no duplicates)
- [ ] Follows existing patterns: `useActionState` + Zod + FormData + `putObject`
