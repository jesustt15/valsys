<!-- BEGIN:valsys-project-rules -->
# valsys — GNC Vehicle & Cylinder Lifecycle Management

## Stack
- **Next.js 16.2.6** (Turbopack, async request APIs, Server Actions)
- **React 19.2.4** (ViewTransitions, Activity, useEffectEvent)
- **Tailwind CSS 4**
- **Drizzle ORM** + PostgreSQL 15
- **Meilisearch** (full-text search)
- **MinIO** (S3-compatible document/image/signature storage)
- **pnpm** workspaces (monorepo)

## Infrastructure
- **Docker Compose**: PostgreSQL + Meilisearch + MinIO
- **Cloudflare Tunnel** (`cloudflared`): external access for certificate downloads
- **No API routes for mutations**: ALL mutations use Next.js Server Actions

## Project Skills
- `skills/valsys-forms/SKILL.md` — form patterns, Server Actions, file uploads, signatures
- `skills/valsys-architecture/SKILL.md` — folder structure, naming, clean architecture layers
- `skills/valsys-drizzle/SKILL.md` — schema design, migrations, queries, indexing
- `skills/valsys-nextjs/SKILL.md` — RSC vs Client boundary, Server Actions, useActionState, common pitfalls

## Technical Workflow

### 1. Intake & Initial Inspection
Create/retrieve Owner and Vehicle. Capture general data (Plate, VIN) and specific attributes via JSONB. Create Inspection with status `inspeccion_inicial`. Populate `inspection_answers` from physical form checklist (Front/Rear sections).

### 2. Component Management (Cylinder Removal)
Register `gnc_cylinders` (new or link existing). Set status to `en_planta`. Store serial numbers, capture photographic evidence in `inspection_attachments` (category: `removal`).

### 3. Recertification & Verification
Receive plant feedback:
- **Scrapped**: status → `de_baja`
- **Recertified**: update `actual_serial`, `last_recalification_date`, status → `pendiente_reinstalacion`
Upload plant documents to MinIO, store keys in `certificates` table.

### 4. Re-mounting & Closing
Final physical check. Ensure all non-compliant items from Step 1 resolved. Capture post-mount photos (category: `post_mount`). Owner signs via tablet (Canvas → MinIO). Inspection → `finalizado`, generate correlative number.

### 5. External Retrieval
Query by `license_plate`. Public-facing route fetches latest `final_cert_key` from MinIO.

## Development
```bash
# Start infrastructure
docker compose up -d

# Run Next.js dev server
cd front && pnpm dev
```
<!-- END:valsys-project-rules -->
