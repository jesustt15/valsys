# Logo Display Specification

## Purpose

Guarantee logo visibility across all app surfaces via a single reusable, theme-agnostic container that enforces a contrast-safe white background with size-scaled padding.

## Requirements

### Requirement: LogoContainer Visual Container

The system MUST provide a `LogoContainer` component (`front/components/logo-container.tsx`) that wraps logo images with a white background, rounded corners, subtle shadow, and flex-centered content. The container MUST render `bg-white`, `shadow-sm`, and use `object-contain` for the inner image.

#### Scenario: Logo on green gradient background

- GIVEN a logo is rendered inside `LogoContainer` on a green gradient background
- WHEN the component renders
- THEN the logo is fully visible with a white background providing contrast against the green

#### Scenario: Logo in dark mode

- GIVEN dark mode is active and a logo is inside `LogoContainer`
- WHEN the component renders
- THEN the white background remains visible and the logo is fully legible

#### Scenario: Logo on light background

- GIVEN a logo is inside `LogoContainer` on a light/white background
- WHEN the component renders
- THEN the container renders consistently with shadow and rounded corners

### Requirement: Size-Scoped Padding and Radius

The `LogoContainer` MUST accept a `size` prop with values `sm`, `md`, `lg`. Each size MUST apply specific padding and border-radius:

| Size | Padding | Radius    | Target logos   |
|------|---------|-----------|----------------|
| `sm` | `p-1.5` | `rounded-lg`    | 36–40px  |
| `md` | `p-2`   | `rounded-xl` | 100–130px |
| `lg` | `p-3`   | `rounded-2xl` | ~180px    |

#### Scenario: Small size for sidebar icon

- GIVEN `LogoContainer` receives `size="sm"`
- WHEN the component renders
- THEN it applies `p-1.5` padding and `rounded-lg` border-radius

#### Scenario: Medium size for footer logos

- GIVEN `LogoContainer` receives `size="md"`
- WHEN the component renders
- THEN it applies `p-2` padding and `rounded-xl` border-radius

#### Scenario: Large size for login hero

- GIVEN `LogoContainer` receives `size="lg"`
- WHEN the component renders
- THEN it applies `p-3` padding and `rounded-2xl` border-radius

### Requirement: Image Prop Forwarding

`LogoContainer` MUST forward `src`, `alt`, `width`, `height`, and other Next.js `<Image>` props to the internal `<Image>` component. It MAY accept an optional `className` for additional outer styling.

#### Scenario: Standard logo usage

- GIVEN `LogoContainer` receives `src="/logo/logoagrogas.png"`, `width={120}`, `height={36}`, `alt="Agrogas"`, `size="md"`
- WHEN the component renders
- THEN it renders a Next.js `<Image>` with those exact props inside the styled container

#### Scenario: Custom className passthrough

- GIVEN `LogoContainer` receives `className="mx-auto"`
- WHEN the component renders
- THEN the outer container includes both base styles and `mx-auto`

### Requirement: Login Page Replacement

The login page (`front/app/page.tsx`) MUST replace all 4 ad-hoc logo `<Image>` usages with `LogoContainer`. The mobile header green chip background MUST be removed — the container becomes the chip.

#### Scenario: Login hero logo

- GIVEN the login page renders the hero section
- WHEN the 180×80 logo is displayed
- THEN it uses `LogoContainer` with `size="lg"` and original dimensions are preserved

#### Scenario: Login mobile header

- GIVEN the login page renders the mobile header
- WHEN the 40×40 icon and 130×38 text logos are displayed
- THEN they use `LogoContainer` with `size="sm"` and `size="md"` respectively, without the green chip background

### Requirement: Sidebar Replacement

The sidebar (`front/components/sidebar.tsx`) MUST replace all 3 logo `<Image>` usages with `LogoContainer`. The `bg-sidebar-primary` icon chip backgrounds MUST be removed.

#### Scenario: Sidebar expanded and collapsed

- GIVEN the sidebar renders in either expanded or collapsed state
- WHEN logo elements are displayed
- THEN they use `LogoContainer` (`size="sm"` for icons, `size="md"` for text) without green chip backgrounds

### Requirement: Consulta Pages Replacement

All three consulta pages (`consulta/page.tsx`, `consulta/[placa]/page.tsx`, `consulta/correlativo/[numero]/page.tsx`) MUST replace their footer logos with `LogoContainer` at `size="md"`.

#### Scenario: Footer logo on each consulta page

- GIVEN a consulta page renders its footer
- WHEN the logo is displayed
- THEN it uses `LogoContainer` with `size="md"` and original dimensions are preserved

### Requirement: No Layout Shift

All replacements MUST preserve existing logo `width` and `height` values. The container adds padding around the unchanged image dimensions.

#### Scenario: Dimensions are preserved

- GIVEN a logo previously rendered at `width={120}` `height={36}`
- WHEN replaced with `LogoContainer`
- THEN the inner image remains 120×36 and the container adds padding around it
