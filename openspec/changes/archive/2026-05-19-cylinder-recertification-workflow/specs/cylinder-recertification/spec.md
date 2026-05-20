# Cylinder Recertification Specification

## Purpose

Provide a dedicated recertification flow for cylinders with status `en_planta`, replacing the generic status dropdown with validated transitions, required field enforcement, per-cylinder plant document upload, and progress tracking on the inspection detail page.

## Requirements

### Requirement: Recertification Server Action

The system MUST provide a `recertifyCylinderAction` Server Action that validates cylinder recertification input, updates the cylinder record, and optionally uploads a plant document to MinIO.

#### Scenario: Successful recertification with document

- GIVEN a cylinder with status `en_planta`
- AND an authenticated operator session
- WHEN `recertifyCylinderAction` is called with `status: 'pendiente_reinstalacion'`, a non-empty `actualSerial`, a valid `recalificationDate`, and a PDF plant document
- THEN the cylinder `status` is updated to `pendiente_reinstalacion`, `actualSerial` and `recalificationDate` are set
- AND the PDF is uploaded to MinIO under `inspections/{inspectionId}/plant/{cylinderId}/`
- AND an `inspectionAttachments` row is inserted with category `plant`
- AND the response returns `{ success: true }`

#### Scenario: Successful scrapping (de_baja)

- GIVEN a cylinder with status `en_planta`
- AND an authenticated operator session
- WHEN `recertifyCylinderAction` is called with `status: 'de_baja'`
- THEN the cylinder `status` is updated to `de_baja`
- AND `actualSerial` and `recalificationDate` are NOT required
- AND the response returns `{ success: true }`

#### Scenario: Missing actualSerial for recertification rejected

- GIVEN a cylinder with status `en_planta`
- WHEN `recertifyCylinderAction` is called with `status: 'pendiente_reinstalacion'` and empty or missing `actualSerial`
- THEN the action returns `{ success: false, error: "El número de serie actual es obligatorio para recertificación" }`
- AND no database update occurs

#### Scenario: Missing recalificationDate for recertification rejected

- GIVEN a cylinder with status `en_planta`
- WHEN `recertifyCylinderAction` is called with `status: 'pendiente_reinstalacion'` and missing `recalificationDate`
- THEN the action returns `{ success: false, error: "La fecha de recalificación es obligatoria para recertificación" }`
- AND no database update occurs

#### Scenario: Invalid source status rejected

- GIVEN a cylinder with status `montado`
- WHEN `recertifyCylinderAction` is called with any target status
- THEN the action returns `{ success: false, error: "Solo se pueden recertificar cilindros en estado 'en_planta'" }`
- AND no database update occurs

#### Scenario: Unauthenticated user rejected

- GIVEN no active session
- WHEN `recertifyCylinderAction` is called
- THEN the action returns `{ success: false, error: "No autorizado" }`

#### Scenario: Non-PDF plant document rejected

- GIVEN a valid recertification request with a plant document
- WHEN the uploaded file is not a PDF (e.g., `.png`, `.docx`)
- THEN the action returns `{ success: false, error: "El documento de planta debe ser PDF" }`
- AND no database update occurs

### Requirement: Status Transition Validation

The system MUST enforce that cylinders with status `en_planta` can only transition to `pendiente_reinstalacion` or `de_baja` through the recertification action. No other transitions are permitted.

#### Scenario: en_planta → pendiente_reinstalacion allowed

- GIVEN a cylinder with status `en_planta`
- WHEN recertified with valid `actualSerial` and `recalificationDate`
- THEN the status transitions to `pendiente_reinstalacion`

#### Scenario: en_planta → de_baja allowed

- GIVEN a cylinder with status `en_planta`
- WHEN recertified with status `de_baja`
- THEN the status transitions to `de_baja`

#### Scenario: en_planta → montado rejected

- GIVEN a cylinder with status `en_planta`
- WHEN recertification is attempted with status `montado`
- THEN the action returns a validation error
- AND no status change occurs

### Requirement: Recertification Panel UI

The system MUST render a `CylinderRecertificationPanel` on the inspection detail page that lists `en_planta` cylinders, provides per-cylinder recertification forms, and shows resolution progress.

#### Scenario: Panel shows en_planta cylinders with forms

- GIVEN an inspection with 3 cylinders, 2 with status `en_planta`
- WHEN the inspection detail page loads
- THEN the panel renders with 2 recertification forms (one per `en_planta` cylinder)
- AND each form shows cylinder brand, initial serial, and fields for status, actualSerial, recalificationDate, and plant document

#### Scenario: Resolved cylinders shown collapsed

- GIVEN a cylinder previously recertified (status ≠ `en_planta`)
- WHEN the panel re-renders after revalidation
- THEN the resolved cylinder is shown in a collapsed state with a summary badge showing its final status

#### Scenario: Panel hidden when no en_planta cylinders

- GIVEN an inspection with zero cylinders of status `en_planta`
- WHEN the inspection detail page loads
- THEN the `CylinderRecertificationPanel` is not rendered

#### Scenario: Panel only visible for eligible inspections

- GIVEN an inspection with status `inspeccion_inicial`
- WHEN the inspection detail page loads
- THEN the `CylinderRecertificationPanel` is not rendered

### Requirement: Progress Indicator

The system MUST display a progress indicator showing X/Y cylinders resolved, where Y is the total count of cylinders that were `en_planta` at page load, and X is the count that have since been recertified (status ≠ `en_planta`).

#### Scenario: Progress shows 0/3 at start

- GIVEN an inspection with 3 cylinders all with status `en_planta`
- WHEN the page loads
- THEN the progress indicator shows "0 de 3 resueltos"

#### Scenario: Progress updates after recertification

- GIVEN 3 cylinders with status `en_planta`, 1 recertified to `pendiente_reinstalacion`
- WHEN the page re-renders after `revalidatePath`
- THEN the progress indicator shows "1 de 3 resueltos"

#### Scenario: Progress shows complete

- GIVEN all cylinders previously `en_planta` have been recertified
- WHEN the page loads
- THEN the progress indicator shows "3 de 3 resueltos" with a completed visual state

### Requirement: Cylinders by Inspection Service

The system MUST provide a service function `getCylindersByInspectionId` that returns all cylinders linked to the vehicle associated with a given inspection, ordered with `en_planta` cylinders first.

#### Scenario: Returns cylinders for inspection's vehicle

- GIVEN an inspection linked to vehicle V1
- AND V1 has 3 cylinders
- WHEN `getCylindersByInspectionId(inspectionId)` is called
- THEN all 3 cylinders are returned

#### Scenario: en_planta cylinders ordered first

- GIVEN cylinders with mixed statuses: `montado`, `en_planta`, `de_baja`
- WHEN `getCylindersByInspectionId` is called
- THEN `en_planta` cylinders appear first in the result array, followed by others

#### Scenario: Empty result for vehicle without cylinders

- GIVEN an inspection linked to a vehicle with no cylinders
- WHEN `getCylindersByInspectionId` is called
- THEN an empty array is returned
