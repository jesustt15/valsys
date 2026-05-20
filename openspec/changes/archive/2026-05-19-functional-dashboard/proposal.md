# Proposal: Functional Dashboard

## Intent

The dashboard at `front/app/(dashboard)/dashboard/page.tsx` is a 100% mockup with hardcoded data — stats cards show fake numbers, recent inspections list fake plates/owners. Operators see no real operational data when they log in. This change connects the dashboard to the database so it displays live inspection counts, vehicle totals, and recent activity.

## Scope

### In Scope
- Convert dashboard page from `'use client'` to Server Component that fetches real data
- Add missing service queries: `countInspectionsByStatus()`, `countInspectionsToday()`, `countVehicles()`
- Add `getRecentInspections(limit)` with owner name via vehicles → owners join
- Add `formatRelativeTime(date)` utility for "Hace X min/hora" display
- Preserve existing UI structure, Framer Motion animations, and responsive layout

### Out of Scope
- Dashboard interactivity (filters, date range, refresh button)
- Real-time updates (WebSocket/SSE)
- Chart/visualization widgets
- Cylinder status stats on dashboard
- Performance optimizations beyond basic query efficiency

## Capabilities

### New Capabilities
- `dashboard-stats`: Real-time count queries for inspection statuses, daily totals, and vehicle counts
- `dashboard-recent-activity`: Recent inspections list with owner names and relative timestamps

### Modified Capabilities
- None

## Approach

**Server Component**: Convert `page.tsx` to an `async` Server Component. Data fetching happens server-side via new service functions. The existing `motion` wrappers and UI structure remain unchanged — only data sources change from hardcoded arrays to `await`ed queries.

**Service layer**: Add dashboard-specific queries to `lib/services/inspection.ts` (counts, recent) and `lib/services/vehicle.ts` (vehicle count). Use Drizzle `count()` and `orderBy().limit()` for efficient queries. The recent inspections query joins through `vehicles → owners` to include owner names.

**Relative time**: Small utility in `lib/utils/format-relative-time.ts` that converts `Date` → Spanish relative string ("Hace 5 min", "Hace 2 horas"). No external dependency needed — simple `Intl.RelativeTimeFormat` wrapper.

**No client boundary change**: The page stays as a Server Component. The `motion` components from framer-motion work in Server Components as long as they receive serializable props. The `Icon` component and all presentational components remain inline.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `front/app/(dashboard)/dashboard/page.tsx` | Modified | Convert to Server Component, replace mock data with `await`ed queries |
| `front/lib/services/inspection.ts` | Modified | Add `countInspectionsByStatus()`, `countInspectionsToday()`, `getRecentInspections()` |
| `front/lib/services/vehicle.ts` | Modified | Add `countVehicles()` |
| `front/lib/utils/format-relative-time.ts` | New | Relative time formatting utility (Spanish locale) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Empty DB on first load shows zeros | High | UI already handles zero values; no special loading state needed for Server Component |
| Framer Motion `motion.div` in Server Component | Low | Framer Motion v11+ supports Server Components; `motion` is a client component but wraps server-rendered children |
| N+1 queries on recent inspections | Medium | Use batched joins (vehicles → owners) instead of per-row queries |

## Rollback Plan

Revert the 4 affected files to their previous state. No schema changes, no migrations, no new dependencies. The dashboard returns to showing mock data — zero operational impact.

## Dependencies

- PostgreSQL running (`docker compose up -d`)
- Existing `inspections`, `vehicles`, `owners` tables with data

## Success Criteria

- [ ] Dashboard shows real inspection counts by status (pending, in-plant, completed)
- [ ] "Inspecciones Hoy" shows actual count of inspections created today
- [ ] "Vehículos" shows total vehicle count from database
- [ ] Recent Inspections list shows real data with owner names and relative timestamps
- [ ] Page loads as Server Component (no `'use client'` directive)
- [ ] All Framer Motion animations preserved and functional
