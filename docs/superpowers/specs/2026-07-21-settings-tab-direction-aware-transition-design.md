# Settings Active-Pill Transition Design

## Goal

Add a smooth transition to the active selection pill in Settings navigation. The interaction must match the measured sliding category pill used on the Kasir page. Settings content itself must not slide or fade.

## Reference Pattern

Reuse the Kasir category-tab interaction model:

- Render one decorative indicator behind the tab labels.
- Measure the active button's inline position and width.
- Move and resize the indicator with CSS custom properties.
- Keep every tab label stationary above the indicator.

This naturally communicates direction because the pill travels from its previous position to the newly selected tab. No separate tab-order or content-direction state is needed.

## Interaction Contract

- The active pill moves between `Profil toko`, `Kategori`, and `Satuan` with the shared design-system `duration-base` and `ease-standard` timing.
- The pill adapts to both Settings layouts: horizontal overflow-safe tabs at compact widths and the 14rem vertical rail at 760px and above.
- In the vertical rail, the same indicator also measures and animates the active button's block position and height.
- The active button keeps `aria-current="page"`; the indicator is decorative and uses `aria-hidden="true"`.
- Labels remain stationary, readable, and above the indicator throughout the transition.
- Existing focus, hover, click, query-parameter, scroll-into-view, loading, and data behavior stays unchanged.
- Remove the previously implemented Motion wrapper from Settings content. Content switches immediately without a slide or crossfade.

## Reduced Motion

Under `prefers-reduced-motion: reduce`, disable the indicator transition. The pill updates to the selected tab immediately while preserving the same selected-state appearance and semantics.

## Implementation Shape

- Extend `SettingsNavigation` with measured indicator state and one decorative indicator element.
- Reuse the existing navigation and item refs; measure the active item relative to the navigation container.
- Recalculate on active-tab changes and container or active-item resize through `ResizeObserver`, with a safe fallback when the API is unavailable.
- Expose inline and block offsets plus indicator width and height through Settings-specific CSS custom properties.
- Keep the implementation local to Settings navigation; do not couple it to Settings content or duplicate the Kasir component.

## Design-System Synchronization

Update the production-backed Settings showcase copy and `frontend/DESIGN.md` to describe the measured sliding active pill and its reduced-motion fallback. Remove all claims that Settings content uses a direction-aware slide transition.

## Verification

- Add source contracts for the decorative indicator, active-item measurement, resize observation, and CSS transition.
- Assert that Settings content no longer imports or renders Motion animation.
- Verify the reduced-motion stylesheet disables the pill transition.
- Run focused Settings and design-system tests, the complete frontend test suite, and the production build.
