# Sidebar Panel Icon Design

## Goal

Replace the generic stacked-rectangle symbol on the desktop sidebar-collapse control with the supplied panel-left symbol, so the control clearly describes the navigation rail it changes.

## Scope

- The shared `sidebar` icon renders a 24px outline panel: an 18px rounded rectangle inset at `(3, 3)` with a vertical divider at `x=9`.
- The existing 180-degree rotation remains the visual state change between collapsed and expanded rail states.
- The control keeps its existing accessible label, expanded state, keyboard focus treatment, and touch target.
- The Navigation Patterns showcase and `frontend/DESIGN.md` document the panel-left collapse affordance.

## Non-goals

- Do not change the sidebar dimensions, navigation destinations, account menu, or any other icon mapping.
- Do not add Lucide as a dependency; the supplied SVG geometry is implemented through the existing shared icon adapter.

## Verification

The AppShell source test asserts the shared icon geometry and the existing accessible collapse semantics. The focused AppShell test file and the frontend production build must pass.
