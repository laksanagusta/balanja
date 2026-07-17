# Settings Skeleton Layout Design

## Problem

`SettingsPageSkeleton` still mirrors the previous Settings page. It uses a wide content-plus-summary grid and renders a secondary summary aside. The production page now uses a responsive settings navigation rail and one centered content surface, so the initial loading state visibly shifts structure when data arrives.

## Design

The Settings skeleton will remain generic across `profile`, `categories`, and `units`, but its outer geometry must match the production workspace exactly.

- The header uses the same compact height, horizontal padding, border, and surface as the production Settings header.
- Compact widths show three horizontal navigation placeholders with a minimum height of 44px.
- From the `md` breakpoint, navigation becomes a 14rem vertical rail.
- The active-content region uses `minmax(0, 1fr)` and contains a centered `max-w-3xl` wrapper.
- The old summary aside is removed completely.
- The generic content panel contains a title/description block, one input-like control with an action, and three row-like placeholders. This shape can transition plausibly into either the profile form or a master-data manager without claiming which tab content is loading.
- The existing skeleton rise and sheen motion language remains unchanged and continues to respect reduced-motion preferences.

The skeleton must avoid fixed page width, horizontal overflow, nested decorative panels, and a second bordered surface around the primary content panel.

## Design-System Sync

`SkeletonShowcase` will include a compact representation of the responsive Settings shell: horizontal navigation at compact showcase widths, a vertical 14rem rail when enough container width exists, and centered generic content.

`frontend/DESIGN.md` will state that Settings initial loading mirrors the responsive navigation rail and centered content geometry, never the removed store-summary aside.

## Testing

- Add a source-contract test for `SettingsPageSkeleton` requiring the 14rem rail, `max-w-3xl` centered content, and 44px compact navigation targets.
- The test rejects the obsolete `xl:grid-cols-[minmax(0,1fr)_360px]` layout and any Settings skeleton aside.
- Extend the Design System test to require the Settings skeleton pattern in `SkeletonShowcase`.
- Run all frontend tests and the production build.
- Verify 390px and 1710px layouts in an authenticated browser when a session is available.
