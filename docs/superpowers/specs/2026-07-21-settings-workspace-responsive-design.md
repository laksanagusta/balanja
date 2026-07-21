# Responsive Settings Workspace Design

## Goal

Make the complete Settings workspace adapt to its available inline space without changing its information architecture, data behavior, or established visual language. The profile form, settings navigation, category manager, unit manager, loading skeleton, and design-system example must remain usable from compact phone widths through wide desktop layouts.

## Current Problem

The page already changes from horizontal tabs to a 14rem navigation rail at Tailwind's viewport-based `md` breakpoint. That is only partially responsive because the persistent app shell can reduce the page's actual content width while the viewport remains wide. The master-data manager also keeps item names, badges, and multiple actions in a single row, which can crowd or overflow at compact widths and under text zoom.

## Chosen Approach

Use a named inline-size container for the Settings workspace and let the workspace's available width—not the browser viewport—control its layout. Keep a mobile-first single-column composition with horizontal, overflow-safe navigation. Introduce the existing 14rem vertical rail only when the Settings container has enough room for both the rail and a useful content column.

This approach preserves the product's existing Settings navigation model and 48rem maximum content width while making the layout reliable inside the app shell.

## Responsive Contract

### Page Shell

- The page remains a full-height flex column with one vertical content scroller.
- Header and workspace padding stay compact at narrow widths and increase only when the container has room.
- The workspace establishes a named inline-size containment context.
- Below the content breakpoint, navigation and content form one column.
- At the content breakpoint, the workspace becomes a two-column grid with a 14rem navigation rail and a `minmax(0, 1fr)` content column.
- The active content surface remains centered and capped at 48rem.
- No child may force horizontal page overflow.

### Settings Navigation

- Compact widths retain the existing horizontal tab row with native horizontal overflow.
- Tabs remain single-line, flex-none, and at least 44px tall.
- At the workspace content breakpoint, tabs become a vertical full-width rail.
- Selection remains a quiet neutral surface with `aria-current="page"`; it never adopts primary-action styling.
- The active tab should be scrolled into the nearest visible range after selection when the compact row overflows.

### Profile Form

- Form fields remain a single readable column.
- The save action fills the available width at the narrowest range, then returns to intrinsic width and inline-end alignment when space permits.
- Tax controls must wrap without separating the checkbox from its label or creating horizontal overflow.
- Interactive controls retain a minimum 44px compact-screen touch target while preserving the denser pointer layout at roomier widths.

### Master-Data Manager

- The create field and action stack at narrow widths and become an input/action row only when the component has sufficient width.
- Active and archived item rows use mobile-first stacked layouts.
- Item identity—the wrapping name and status badge—uses `min-width: 0`; long names wrap instead of pushing actions outside the panel.
- Rename, archive, restore, cancel, and confirmation actions fill or share compact rows predictably, then return to intrinsic widths at larger component sizes.
- Confirmation and rename editors stay directly beneath the item they affect.
- Archive remains reversible; no data or mutation behavior changes.

### Loading Skeleton

- The Settings skeleton mirrors the same container, navigation, content width, compact stacking, and wide rail behavior as the settled workspace.
- Skeleton blocks must not imply a desktop row at widths where production controls stack.
- Existing reduced-motion shimmer behavior remains unchanged.

## Interaction and Motion

- Keep transitions short, tokenized, and limited to explicit color, opacity, and transform changes.
- Buttons provide immediate press feedback through the shared primitive.
- No layout animation is added for breakpoint changes.
- Reduced-motion preferences continue to remove nonessential spatial motion.
- Reduced-transparency and increased-contrast behavior continues to come from shared surfaces and tokens; the responsive work introduces no new glass material.

## Accessibility

- Preserve visible labels, `aria-current`, keyboard focus styling, and semantic button behavior.
- Maintain at least 44px touch targets at compact widths.
- Avoid clipped text and horizontal page scrolling at 320px CSS width and under increased text size.
- DOM order remains navigation followed by active content, matching visual and keyboard order at every layout.

## Design-System Synchronization

Because this changes a production feature's responsive behavior, update both sources of design-system truth:

- `frontend/src/pages/DesignSystemPage.jsx` through its production-backed Settings/master-data showcase components.
- `frontend/DESIGN.md` with the container-aware breakpoint, compact row behavior, touch-target rule, and overflow contract.

The showcase must continue to consume production components rather than duplicating a mock implementation.

## Implementation Boundaries

Expected implementation files are limited to the Settings page, Settings navigation, master-data manager, Settings skeleton, their focused tests, and the design-system documentation/showcase needed to stay synchronized. Business logic, routes, store loading behavior, mutations, and unrelated application layouts are out of scope.

Existing unrelated worktree changes must be preserved.

## Verification

- Add focused source-contract tests for the Settings container, compact-to-rail transition, wrap-safe rows, stacked action behavior, and skeleton parity.
- Run the focused Settings, navigation, loading, and design-system tests.
- Run the frontend test suite and production build.
- Inspect the rendered workspace at narrow phone, large phone, tablet/app-shell-constrained, and desktop widths, including long item names and archived rows.
- Confirm that no tested width introduces horizontal page overflow and that all compact controls remain comfortably tappable.
