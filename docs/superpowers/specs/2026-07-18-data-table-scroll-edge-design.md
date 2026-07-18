# Data Table Scroll Edge Design

**Date:** 2026-07-18

## Goal

Keep operational data tables dense and comparable at every viewport width while making horizontal overflow obvious and comfortable to navigate. Every shared `DataTable` should show a light, translucent edge treatment only where additional columns remain off-screen.

## Scope

- Preserve the current table presentation on Produk, Stok, Transaksi, and every other consumer of the shared `DataTable`.
- Add one reusable scroll-edge primitive and compose it inside `DataTable`.
- Add the pattern to the data-table design-system showcase.
- Synchronize the shared behavior into `frontend/DESIGN.md`.
- Add focused tests for overflow state and the shared component contract.

This change does not introduce a mobile card view, change table columns, change server pagination or sorting, or redesign page toolbars.

## Component Architecture

Create a small `ScrollEdge` primitive responsible for its own scroll container, measurements, and decorative edge layers. `DataTable` composes its table inside this primitive, so consumers do not receive a `showEdgeBlur` or similar boolean prop.

The primitive exposes only structural composition through `children` and `className`. Its internal state represents whether content remains before or after the visible inline range. It does not know about table data, sorting, pagination, or page state.

This boundary keeps overflow behavior reusable and prevents per-page scroll listeners or conditional styling.

## Overflow State

The scroll viewport derives four presentation states from `scrollLeft`, `clientWidth`, and `scrollWidth`:

- No overflow: neither edge is visible.
- At the start: only the inline-end/right edge is visible.
- In the middle: both edges are visible.
- At the end: only the inline-start/left edge is visible.

Use a small pixel tolerance when comparing the scroll endpoint so fractional layout values do not leave a false edge visible. Recalculate after scrolling, on viewport resize, and when the scroll content changes size. Event and observer cleanup must occur when the primitive unmounts.

The behavior is presentation-only. It must not change table focus order, keyboard navigation, sorting, row actions, or horizontal scrolling.

## Visual Treatment

Each visible edge is a 28px-wide non-interactive overlay:

- Use a light, surface-colored transparent gradient that fades toward the table content.
- Apply a restrained `backdrop-filter` blur of 6px.
- Do not add a hard divider, dark shadow, or opaque block.
- Keep the overlay `pointer-events: none` and hidden from assistive technology.
- Transition only overlay opacity with the existing fast functional motion token.
- Do not hide or disable the native horizontal scrollbar.

At inline-start, the surface is strongest at the outer boundary and clears toward the table content. Inline-end mirrors that direction. The effect must remain legible on alternating table rows without obscuring the first or last fully visible cell.

Under `prefers-reduced-transparency: reduce`, remove backdrop blur and raise the surface opacity enough to preserve the overflow cue. Under `prefers-contrast: more`, use a more defined surface fade without relying on blur alone. Reduced motion removes the opacity transition while preserving state changes.

## Design-System Integration

The shared `DataTable` receives the behavior by default, so existing page call sites remain unchanged. The data-table showcase must include a deliberately wide example inside a constrained region so the start, middle, and end states can be inspected at `/design-system`.

Update `frontend/DESIGN.md` before or together with the feature implementation. Document that operational tables remain tables on compact screens, use horizontal scrolling when required, and communicate hidden inline content with conditional light-translucent scroll edges.

## Error and Compatibility Behavior

If `ResizeObserver` is unavailable, the table remains horizontally scrollable and updates its edge state through initial measurement, scroll events, and window resize. The visual enhancement may be less reactive to content-only size changes, but table access must never depend on it.

The primitive must tolerate an initially hidden or zero-width container and recalculate when it becomes measurable.

## Verification

Automated checks should cover:

- The shared `DataTable` composes the scroll-edge primitive without a new boolean display prop.
- A non-overflowing table shows neither edge.
- An overflowing table at its initial position shows only the trailing edge.
- Scrolling into the middle shows both edges.
- Reaching the endpoint hides the trailing edge and keeps the leading edge.
- Edge layers are decorative and cannot intercept pointer input.
- Resize/content measurement updates the edge state.
- Reduced-transparency, increased-contrast, and reduced-motion fallbacks are present.

Run the frontend test suite and production build. Visually inspect the constrained showcase plus Produk, Stok, and Transaksi at compact and desktop widths. Confirm that horizontal scrolling remains direct, row actions remain usable, the effect disappears at each reached boundary, and no table text or controls become inaccessible.
