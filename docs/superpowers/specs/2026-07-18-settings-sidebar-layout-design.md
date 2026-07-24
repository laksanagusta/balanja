# Settings Sidebar Layout Design

## Summary

The Settings page will replace its floating segmented tabs and two-column summary layout with a focused settings workspace. Desktop widths use a quiet vertical navigation rail on the left and a centered content column on the right. Compact widths convert the same navigation items into a horizontally scrollable tab row above the content.

The `Current store / Local MVP` summary panel is removed. Store information remains editable and visible in the profile form, so the summary duplicates content without helping the settings task.

## Goals

- Give `Profil toko`, `Kategori`, and `Satuan` a clear, stable information hierarchy.
- Center the active settings surface within the available content area.
- Preserve query-backed navigation at `/settings?tab=<tab>`.
- Keep every navigation target at least 44px tall on compact screens.
- Use one composable navigation structure instead of separate desktop and mobile component APIs.
- Keep the implementation aligned with the production design system.

## Non-goals

- Adding or changing settings functionality.
- Changing category or unit mutation behavior.
- Introducing nested settings routes or a new routing library.
- Redesigning shared application navigation.
- Adding a generic tab component solely for this page.

## Layout

The page header remains compact and continues to display the page title and updating state.

Below the header, the settings workspace is mobile-first:

- Compact widths render navigation as one horizontal, overflow-safe row above the active content.
- From the medium content breakpoint upward, the workspace becomes a two-column grid with a 14rem navigation rail and a flexible content region.
- The active content region contains a centered wrapper with a maximum width of 48rem.
- The profile form and both master-data managers use the same content width and alignment.
- The entire `Current store / Local MVP` aside is removed.

The master-data manager remains the primary bordered panel. It is not wrapped inside another decorative panel, avoiding nested-card noise.

## Navigation

The navigation is rendered once from the existing tab definition. Each item remains a button because navigation is handled by the shared app router callback. It retains its query destination as metadata and exposes the selected state through `aria-current="page"`.

At desktop widths, items stack vertically and fill the rail width. At compact widths, they sit in a single horizontal row with overflow available when content cannot fit. Each target is at least 44px high.

The selected item uses a neutral muted surface, border, and stronger text. It does not use the primary action color. Hover and focus treatments use existing semantic tokens and standard motion durations.

The navigation component accepts the tab collection, selected ID, and change callback. Responsive appearance is handled in CSS classes rather than boolean presentation props. The page composes navigation and active content explicitly.

## Responsive Behavior

- Start with the compact horizontal layout and enhance to the vertical rail at the content-driven medium breakpoint.
- Avoid fixed content widths; use `minmax(0, 1fr)`, `w-full`, and a maximum width constraint.
- Prevent horizontal overflow in both the navigation row and master-data actions.
- Keep action controls reachable and preserve existing wrapping behavior inside master-data rows.
- Do not use viewport-height assumptions; the existing page scroll container remains responsible for vertical overflow.

## Design-System Sync

The Design System page will show the production settings navigation and centered content-shell pattern. `frontend/DESIGN.md` will define the vertical desktop rail, compact horizontal fallback, neutral selected state, 44px targets, centered content width, and removal of redundant summary panels.

The showcase must consume the same production navigation component used by Settings. Production code must not import showcase code.

## Testing

- Source/component tests verify that Settings no longer renders `Current store` or `Local MVP`.
- Tests verify all three query-backed navigation items and the selected-state accessibility attribute.
- Component tests verify the navigation exposes horizontal compact and vertical medium-width layout classes without boolean mode props.
- Design-system tests verify the settings layout pattern is represented.
- The existing Settings and master-data behavior tests remain green.
- `npm run build` verifies the production bundle.
- Visual verification covers a compact mobile width and a desktop width, checking centered content, 44px targets, wrapping, and absence of horizontal overflow.
