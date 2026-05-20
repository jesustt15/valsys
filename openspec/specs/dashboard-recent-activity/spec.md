# Dashboard Recent Activity Specification

## Purpose

Display a list of recent inspections with owner names and relative timestamps on the dashboard.

## Requirements

### Requirement: Recent Inspections with Owner Name

The system MUST return the N most recent inspections (default 5) including license plate, status, owner full name, and creation timestamp. The query MUST join through `vehicles → owners` to resolve owner names without N+1 queries.

#### Scenario: Inspections with linked vehicles and owners

- GIVEN 5 inspections exist with vehicles that have owners
- WHEN `getRecentInspectionsWithOwner(5)` is called
- THEN it returns 5 records with plate, status, owner name, and timestamp ordered by most recent

#### Scenario: Inspection with no vehicle

- GIVEN an inspection has a null `vehicleId`
- WHEN `getRecentInspectionsWithOwner(5)` is called
- THEN the record is included with null/empty plate and owner fields

#### Scenario: Vehicle with no owner

- GIVEN a vehicle has a null `ownerId`
- WHEN `getRecentInspectionsWithOwner(5)` is called
- THEN the record is included with the plate but null/empty owner name

#### Scenario: Fewer inspections than requested limit

- GIVEN only 2 inspections exist
- WHEN `getRecentInspectionsWithOwner(5)` is called
- THEN it returns the 2 available records

#### Scenario: No inspections exist

- GIVEN the inspections table is empty
- WHEN `getRecentInspectionsWithOwner(5)` is called
- THEN it returns an empty array

### Requirement: Relative Time Formatting

The system MUST format timestamps as Spanish relative time strings (e.g., "Hace 5 min", "Hace 2 horas", "Hace 3 días").

#### Scenario: Recent timestamp (minutes ago)

- GIVEN a timestamp 5 minutes in the past
- WHEN `formatRelativeTime()` is called
- THEN it returns "Hace 5 min"

#### Scenario: Timestamp hours ago

- GIVEN a timestamp 2 hours in the past
- WHEN `formatRelativeTime()` is called
- THEN it returns "Hace 2 horas"

#### Scenario: Timestamp days ago

- GIVEN a timestamp 3 days in the past
- WHEN `formatRelativeTime()` is called
- THEN it returns "Hace 3 días"

#### Scenario: Future timestamp

- GIVEN a timestamp in the future
- WHEN `formatRelativeTime()` is called
- THEN it returns a forward-looking string (e.g., "En 5 min") or falls back to the absolute date

### Requirement: Recent Inspections UI Rendering

The dashboard MUST display the recent inspections list using real data passed from the Server Component, preserving the existing card layout, status badges, and Framer Motion stagger animations.

#### Scenario: Full list renders

- GIVEN 5 recent inspections with complete data
- WHEN the dashboard renders
- THEN each row shows plate (monospace), owner name, status badge, and relative time

#### Scenario: Empty list renders

- GIVEN no inspections exist
- WHEN the dashboard renders
- THEN the recent inspections card renders with an empty state message or no rows

#### Scenario: Animations preserved

- GIVEN the page is a Server Component
- WHEN the dashboard renders
- THEN Framer Motion `motion.div` wrappers animate rows with staggered delays as before
