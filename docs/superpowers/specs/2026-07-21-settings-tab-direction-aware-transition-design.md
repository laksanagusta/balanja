# Settings Tab Direction-Aware Transition Design

## Goal

Add a smooth, restrained directional transition when moving between the Settings tabs without delaying navigation, changing data behavior, or weakening accessibility.

## Motion Vocabulary

The effect is a **direction-aware transition**: content slides one way going forward and the opposite way going back, so navigation has a sense of direction.

The Settings order is `profile → categories → units`. Moving to a later tab enters from the inline-end side; moving to an earlier tab enters from the inline-start side.

## Interaction Contract

- Animate only the active content surface, not the page header or Settings navigation.
- The first settled render appears without a slide.
- Each later tab change gives the entering content a small 20px horizontal offset based on direction and raises opacity from 0.7 to 1.
- Use a critically damped Motion spring with no bounce and a perceptual response around 240–300ms.
- Do not add an exit delay. The prior content leaves immediately so rapid tab changes remain responsive and never lock navigation.
- A newly selected tab interrupts and replaces any in-progress entrance rather than waiting for it to finish.
- Keep the content wrapper shrink-safe and clip only transient horizontal motion so the animation cannot create page-level overflow.

## Reduced Motion

When `prefers-reduced-motion` is active, remove horizontal translation and use a short opacity crossfade. Navigation, focus order, and content rendering remain identical.

## Loading and Data

Do not change existing Settings loading, refetch, mutation, or query-parameter behavior. The transition applies whenever the active settled tab content is rendered. Existing full-page initial skeleton behavior remains unchanged.

## Implementation Shape

- Derive tab direction from stable tab indices and the previously rendered tab.
- Isolate direction calculation in a small exported helper so it can be tested without rendering React.
- Wrap the active Settings content branches in one keyed Motion surface.
- Read reduced-motion preference through Motion's React API.
- Keep transform and opacity as the only animated properties.

## Design-System Synchronization

Update the production-backed Settings showcase copy to name the direction-aware transition and its reduced-motion fallback. Add the same contract to `frontend/DESIGN.md`; do not duplicate the production animation implementation inside the showcase.

## Verification

- Unit-test forward, backward, and unchanged direction calculation.
- Add a source contract for the keyed Motion surface, 20px directional offset, no-bounce spring, and reduced-motion crossfade.
- Run focused Settings and design-system tests.
- Run the complete frontend test suite and production build.
