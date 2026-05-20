# Certificate Management Specification

## Purpose

Manage certificate issuance for inspections: upload plant recertification documents, assign a company correlative number (invoice code), store artifacts in MinIO, and display certificate status on the inspection detail page.

## Requirements

### Requirement: Certificate Retrieval

The system MUST provide a service function to retrieve a certificate by inspection ID, returning all stored fields including MinIO keys and correlative number.

#### Scenario: Certificate exists for inspection

- GIVEN an inspection with an associated certificate record
- WHEN `getCertificateByInspectionId` is called with that inspection ID
- THEN the certificate record is returned with `correlativeNumber`, `plantDocKey`, `finalCertKey`, and `issueDate`

#### Scenario: No certificate for inspection

- GIVEN an inspection with no associated certificate record
- WHEN `getCertificateByInspectionId` is called with that inspection ID
- THEN `null` is returned

### Requirement: Certificate Creation via Server Action

The system MUST provide a Server Action that accepts `FormData` containing `inspectionId`, `plantDoc` (PDF file), and `correlativeNumber` (manually entered text), validates inputs, uploads the PDF to MinIO, and creates a certificate record in a single operation.

#### Scenario: Successful certificate creation

- GIVEN an authenticated operator session
- AND an inspection in status `en_planta` or `finalizado`
- AND no existing certificate for that inspection
- WHEN `createCertificateAction` is called with valid `FormData` containing `inspectionId`, a PDF `plantDoc`, and a non-empty `correlativeNumber`
- THEN the PDF is uploaded to MinIO under `certificates/{inspectionId}/plant/`
- AND a certificate row is inserted with the provided `correlativeNumber`, the MinIO key, and `issueDate` set to today
- AND the response returns `{ success: true, data: { correlativeNumber } }`

#### Scenario: Duplicate correlative number rejected

- GIVEN a certificate already exists with correlative number `ABC-1234`
- WHEN `createCertificateAction` is called with `correlativeNumber` = `ABC-1234`
- THEN the action returns `{ success: false, error: "El número correlativo ya existe" }`
- AND no new certificate row is created

#### Scenario: Inspection without eligible status

- GIVEN an inspection in status `inspeccion_inicial`
- WHEN `createCertificateAction` is called for that inspection
- THEN the action returns `{ success: false, error: "La inspección no está en estado válido" }`
- AND no file is uploaded and no record is created

#### Scenario: Certificate already exists for inspection

- GIVEN a certificate already exists for the given inspection
- WHEN `createCertificateAction` is called for that inspection
- THEN the action returns `{ success: false, error: "Ya existe un certificado para esta inspección" }`

#### Scenario: Missing or invalid plantDoc

- GIVEN `FormData` without a `plantDoc` file or with a non-PDF file
- WHEN `createCertificateAction` is called
- THEN the action returns `{ success: false, error: "El documento de planta es requerido y debe ser PDF" }`

#### Scenario: Missing correlative number

- GIVEN `FormData` with an empty or whitespace-only `correlativeNumber`
- WHEN `createCertificateAction` is called
- THEN the action returns `{ success: false, error: "El número correlativo es requerido" }`

#### Scenario: Unauthenticated user

- GIVEN no active session
- WHEN `createCertificateAction` is called
- THEN the action returns `{ success: false, error: "No autorizado" }`

### Requirement: Certificate Display on Inspection Detail

The system MUST display a certificate card on the inspection detail page that shows existing certificate information or a creation form, gated by inspection status.

#### Scenario: Certificate card shows existing certificate

- GIVEN an inspection with an issued certificate
- WHEN the inspection detail page loads
- THEN a "Certificado" card displays the `correlativeNumber`, `issueDate`, and a download link for the plant document
- AND no creation form is shown

#### Scenario: Certificate card shows creation form

- GIVEN an inspection in status `en_planta` or `finalizado` with no certificate
- WHEN the inspection detail page loads
- THEN a "Certificado" card displays a form with: a text input for `correlativeNumber`, a file input for `plantDoc` (PDF only), and a submit button
- AND form submission uses `useActionState` with the Server Action

#### Scenario: Certificate card hidden for ineligible status

- GIVEN an inspection in status `inspeccion_inicial` with no certificate
- WHEN the inspection detail page loads
- THEN no certificate card is rendered

#### Scenario: Form submission feedback

- GIVEN the certificate creation form is visible
- WHEN the form is submitted and the Server Action succeeds
- THEN the card re-renders to show the issued certificate info (Scenario: Certificate card shows existing certificate)
- WHEN the Server Action fails
- THEN an error message is displayed below the form without losing entered values
