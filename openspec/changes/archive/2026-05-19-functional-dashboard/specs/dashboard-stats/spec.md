# Dashboard Stats Specification

## Purpose

Provide real-time count queries for inspection statuses, daily totals, and vehicle counts displayed on the dashboard.

## Requirements

### Requirement: Count Inspections by Status

The system MUST return the count of inspections grouped by status (`inspeccion_inicial`, `en_planta`, `finalizado`).

#### Scenario: All statuses have inspections

- GIVEN the database contains inspections with mixed statuses
- WHEN `countInspectionsByStatus()` is called
- THEN it returns a map with counts for each status present

#### Scenario: No inspections exist

- GIVEN the inspections table is empty
- WHEN `countInspectionsByStatus()` is called
- THEN it returns an empty map or zero counts for all statuses

#### Scenario: Only one status has inspections

- GIVEN only `inspeccion_inicial` inspections exist
- WHEN `countInspectionsByStatus()` is called
- THEN it returns a count for `inspeccion_inicial` and zero (or absent) for other statuses

### Requirement: Count Inspections Today

The system MUST return the count of inspections created on the current calendar date (server timezone).

#### Scenario: Inspections were created today

- GIVEN 3 inspections have `created_at` within the current calendar date
- WHEN `countInspectionsToday()` is called
- THEN it returns `3`

#### Scenario: No inspections today

- GIVEN no inspections have `created_at` within the current calendar date
- WHEN `countInspectionsToday()` is called
- THEN it returns `0`

### Requirement: Count Vehicles

The system MUST return the total count of vehicles registered in the system.

#### Scenario: Vehicles exist

- GIVEN 143 vehicles are registered
- WHEN `countVehicles()` is called
- THEN it returns `143`

#### Scenario: No vehicles exist

- GIVEN the vehicles table is empty
- WHEN `countVehicles()` is called
- THEN it returns `0`

### Requirement: Dashboard Server Component

The dashboard page MUST be a Server Component that fetches all stats data server-side before rendering. The page MUST NOT contain a `'use client'` directive.

#### Scenario: Page renders with real data

- GIVEN the database has inspection and vehicle records
- WHEN the dashboard page is requested
- THEN it renders stats cards with real counts from the database

#### Scenario: Page renders with empty database

- GIVEN the database has no records
- WHEN the dashboard page is requested
- THEN it renders stats cards showing zero values without errors

#### Scenario: Quick actions remain static

- GIVEN the dashboard page is a Server Component
- WHEN rendering
- THEN quick actions (Nuevo Dueño, Nuevo Vehículo, Nueva Inspección) render with static data as before

### Requirement: Error Handling for Missing Data

The dashboard MUST handle database connection failures gracefully by showing a non-blocking error state while preserving the page layout.

#### Scenario: Database is unreachable

- GIVEN the PostgreSQL connection fails
- WHEN the dashboard page is requested
- THEN it renders the page skeleton with error indicators on stat cards instead of crashing
