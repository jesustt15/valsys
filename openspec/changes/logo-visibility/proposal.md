# Proposal: Logo Visibility — Reusable Container Across Surfaces

## Intent

The valsys logo (`logoagrogas.png` wide, `logoagrogas2.png` square) disappears on three backgrounds because its green and black parts match the surface:

- **Login** (`front/app/page.tsx:30`): `from-green-600 via-green-700 to-green-800` gradient + mobile `bg-green-600` chip (line 119) swallow the green logo parts.
- **Sidebar** (`front/components/sidebar.tsx:58,70`): icon container is `bg-sidebar-primary` = `#119C03` (light, `globals.css:37`) / `#22c55e` (dark, `globals.css:75`) — both green.
- **Consulta pages** (`front/app/consulta/page.tsx:13`): light mode is pale (visible), but `dark:from-slate-950 dark:to-slate-900` hides the logo's black parts.

Only two PNG assets exist (`front/public/logo/`); no theme variants, so a per-theme asset swap is not possible without producing new art. A single theme-agnostic container is the pragmatic fix.

## Scope

### In Scope
- New presentational `LogoContainer` component: white bg, rounded corners, subtle shadow, inner padding, flex-centered, wraps `next/image`.
- Replace the 7 ad-hoc logo `<Image>` usages across 5 files with `LogoContainer`.
- Preserve existing logo dimensions/proportions (container adds padding around unchanged `width`/`height`).

### Out of Scope
- Favicon / apple icon (`front/app/layout.tsx:14-15`) — favicons do not render in-app.
- New logo asset creation or per-theme logo variants.
- Sidebar layout/animation changes and login gradient/branding redesign.
- Server-side or data changes (pure UI).

## Capabilities

### New Capabilities
- `logo-display`: Guaranteed logo visibility across all app surfaces via a single reusable, theme-agnostic container that enforces a contrast-safe background.

### Modified Capabilities
- None. No existing spec-level behavior changes; this is additive UI consistency.

## Approach

1. **`front/components/logo-container.tsx`** (new): wraps `next/image` with `bg-white rounded-lg shadow-sm` + padding, flex-centered. Props: `src`, `alt`, `width`, `height`, optional `className` passthrough, optional `size` (`sm`/`md`/`lg`) to scale padding/radius. Retains `object-contain`.
2. **Rationale**: a permanent white background is the only single mechanism that contrasts against green (sidebar/login) **and** black (consulta dark mode) in **both** light and dark themes — solving all three failure modes with one component. DRY replaces 7 duplicated usages; future logo placements get contrast for free.
3. **Replacements** (dimensions unchanged): `page.tsx:45,98,120,122`; `sidebar.tsx:59,61,72`; `consulta/page.tsx:67`; `consulta/[placa]/page.tsx:234`; `consulta/correlativo/[numero]/page.tsx:211`.
4. The existing green icon chips (`page.tsx:119`, `sidebar.tsx:58,70`) lose their `bg-green-600`/`bg-sidebar-primary` — the container itself becomes the chip.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `front/components/logo-container.tsx` | New | Reusable theme-agnostic logo wrapper |
| `front/app/page.tsx` | Modified | 4 logo usages → `LogoContainer` (lines 45, 98, 120, 122); drop green chip at 119 |
| `front/components/sidebar.tsx` | Modified | 3 logo usages → `LogoContainer` (lines 59, 61, 72); drop `bg-sidebar-primary` chips |
| `front/app/consulta/page.tsx` | Modified | Footer logo → `LogoContainer` (line 67) |
| `front/app/consulta/[placa]/page.tsx` | Modified | Footer logo → `LogoContainer` (line 234) |
| `front/app/consulta/correlativo/[numero]/page.tsx` | Modified | Footer logo → `LogoContainer` (line 211) |
| `openspec/specs/logo-display/spec.md` | New | Capability spec for contrast-safe logo presentation |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| White box looks heavy on premium green login hero | Medium | Subtle shadow + modest padding; `size`/`variant` prop lets design phase tune radius & padding per surface |
| Sidebar collapsed (80px rail) container overflows | Low | Container sized to existing 36px slot; verify collapsed layout in design phase |
| Aesthetic change to already-working light-mode consulta footers | Low | Consistent treatment is the explicit goal; minor visual change is expected & acceptable |
| Two logo aspect ratios (wide vs square) in same component | Low | `object-contain` + flex centering retained; `size` prop accommodates both |

## Rollback Plan

1. `git revert` the component + 5 file edits — no data/schema changes, no migrations.
2. Original green chips and bare `<Image>` usages are restored verbatim.
3. No persistent side effects; logos remain as today.

## Dependencies

- `next/image` (already in use across all 5 files).
- Tailwind CSS 4 utility classes (existing).
- No new packages, no schema, no Server Action changes.

## Success Criteria

- [ ] Logo fully visible on login green gradient (gradient is theme-independent).
- [ ] Logo icon visible in sidebar expanded **and** collapsed, in light **and** dark.
- [ ] Logo visible on all three consulta pages in light **and** dark mode.
- [ ] Single `LogoContainer` used in all 5 files; no ad-hoc logo `<Image>` remains.
- [ ] No layout shift; logo `width`/`height` unchanged.
- [ ] `pnpm lint` and `tsc --noEmit` pass (project's only quality gates; `testing.runner: none`).

## Proposal question round

One open decision for review before specs/design:

- **Container padding/radius: fixed vs. size-scaled?** Logos span 36px (sidebar icon) → 180px (login hero). Fixed padding looks inconsistent across that range; a `size` prop scales padding/radius per usage while keeping Image dimensions fixed.
- **Assumed answer**: accept a `size` (`sm`/`md`/`lg`) prop with per-call defaults. If you prefer a single fixed padding everywhere, say so and the spec simplifies to one style.
