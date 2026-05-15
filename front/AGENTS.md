<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Technical Workflow: GNC Vehicle & Cylinder Lifecycle

This context is crucial for all agents working on the project. It outlines the core business logic of the system.

## 1. Intake & Initial Inspection
- **Action:** Create or retrieve Owner and Vehicle.
- **Process:** Capture general data (Plate, VIN) and specific attributes via JSONB (axles, load capacity, etc.).
- **State:** Create an Inspection record with status `inspeccion_inicial`.
- **Checklist:** Populate `inspection_answers` based on the physical form's requirements (Front/Rear sections).

## 2. Component Management (Cylinder Removal)
- **Action:** Register `gnc_cylinders` if new; otherwise, link existing ones.
- **Status Update:** Set cylinder status to `en_planta`.
- **Persistence:** Store initial serial numbers and capture photographic evidence of the "as-is" state in `inspection_attachments`.

## 3. Recertification & Verification
- **Action:** Receive feedback from the external plant.
- **Decision Logic:** 
  - *If Scrapped:* Update cylinder status to `de_baja`.
  - *If Recertified:* Update `actual_serial`, `last_recalification_date`, and status to `pendiente_reinstalacion`.
- **Document Handling:** Scan plant-issued documents and upload to MinIO; store keys in the `certificates` table.

## 4. Re-mounting & Closing
- **Action:** Final physical check on the vehicle.
- **Validation:** Ensure all "Non-Compliant" items from Step 1 are resolved.
- **Signature:** Capture Owner's Signature via the tablet interface (Canvas to Base64 to MinIO).
- **Finalization:** Set inspection status to `finalizado` and generate the `correlative_number` for the final certificate.

## 5. External Retrieval
- **Action:** Query by `license_plate`.
- **Access:** Public-facing or restricted route fetches the latest `final_cert_key` from MinIO for the owner to download.
