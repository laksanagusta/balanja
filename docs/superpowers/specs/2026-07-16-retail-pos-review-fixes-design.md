# Retail POS Review Fixes Design

## Goal

Resolve every actionable finding from the React performance, component-composition, and Web Interface Guidelines review of the retail POS page without changing its established visual direction or cashier workflow.

## Scope

The work covers the production POS page and the reusable components it renders:

- Cash payment parsing, validation, error presentation, and change calculation.
- Search, category filters, payment selection, quantity controls, loading status, and motion accessibility.
- Product-catalog rendering performance during search, cart updates, and cash entry.
- Separation of reusable production components from design-system showcase modules.
- An explicit POS product-card variant instead of boolean mode combinations.
- Synchronization of the design-system showcases and `frontend/DESIGN.md`.

The work does not redesign the POS layout, replace the POS store, introduce server-side product search, or change checkout API semantics.

## Architecture

Reusable runtime components move out of `components/design/*Showcase.jsx` into focused production modules under `components/pos/` and `components/feedback/`. Showcase files import and demonstrate those production components, making the design system a consumer rather than an application dependency.

The production surface exposes an explicit `PosProductCard` variant. It owns the repeat-add behavior and single-action footer required by POS, while shared product-card presentation remains reusable. This removes the `showStepper` and `allowRepeatAdd` configuration pair from `RetailPosPage`.

The product catalog becomes a memoized child component. Filtering uses a deferred query and memoized computation. Each card receives stable data where practical, and off-screen cards use CSS `content-visibility: auto` with an intrinsic-size fallback. This avoids rebuilding the entire product grid when cash, payment, or dialog state changes without adding a virtualization dependency.

## Behavior and Accessibility

Cash parsing must accept only finite, non-negative numeric input. Empty or malformed values are invalid for a non-empty cash checkout. The checkout handler repeats validation at submission time, so UI state cannot bypass it. Change appears only when the cart is non-empty and a valid cash amount covers the total.

The cash input receives a stable name, autocomplete policy, invalid state, and an associated inline error. Checkout remains unavailable while the cart is empty or a request is pending; invalid cash is reported inline and rechecked on activation.

The product search has an accessible label, name, autocomplete policy, keyboard-shortcut metadata, and visible focus treatment on its compound wrapper. Copy uses the single ellipsis character and platform-neutral shortcut text.

Category filters and payment-method controls expose their selected state through `aria-pressed`. Cart quantity icon buttons receive specific accessible names. Updating and calculated-change messages use polite live regions where announcements are useful. Pulse animation is disabled when reduced motion is requested.

The page stops reading Clerk user data solely to pass a discarded checkout argument. Cashier identity continues to come from the authenticated backend request.

## Design-System Synchronization

Existing showcases keep their visual examples but import the extracted production components. The POS patterns showcase demonstrates the explicit POS card variant and the accessible selection states. `frontend/DESIGN.md` documents the production/showcase dependency direction, POS form semantics, explicit variants, and catalog rendering rule.

## Testing

Tests are written before implementation and cover:

- Finite cash parsing and invalid-input rejection.
- No change message for an empty cart or empty cash value.
- Search labeling, focus treatment, shortcut metadata, and typographic ellipses.
- Cash error association and selected-state semantics.
- Memoized/deferred catalog structure and off-screen rendering class.
- Production pages no longer importing `*Showcase.jsx` modules.
- Explicit `PosProductCard` use without the old boolean mode props.
- Accessible cart quantity controls and reduced-motion updating status.

After targeted tests pass, run the full frontend test suite, production build, and `git diff --check`.
