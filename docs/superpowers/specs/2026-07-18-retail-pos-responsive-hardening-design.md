# Retail POS Responsive Hardening Design

## Goal

Resolve the responsiveness findings in the production cashier workspace without changing transaction semantics or the established quiet retail visual direction.

## Layout

The app-shell content area becomes the source of truth for breakpoints. A named `retail-pos` query container wraps the workspace. Below 960px of available content width, the product catalog and cart stack and the workspace owns the only vertical scroll. At 960px and above, the workspace becomes two columns, the cart width is clamped between 400px and 500px, and the catalog and cart list may scroll independently inside the fixed-height workspace.

The product pane is a second named container. Its grid moves from one through four columns based on the actual catalog width rather than the browser viewport.

## Interaction

Search, barcode scanning, category selection, product add, quantity, payment method, checkout, and cart clearing expose at least a 44px hit area. Category selection is rendered directly on the active button so variable-width and overflowing tabs stay aligned. Selection changes scroll the active button into the nearest visible horizontal range without decorative smooth motion.

## Content resilience

Cart headings and payment summary rows keep labels shrinkable and currency values intact. When the cart container is 360px or narrower, label/value rows stack so long rupiah values and increased text size do not create horizontal overflow.

## Design-system synchronization

`frontend/DESIGN.md` defines the responsive contract. `POSPatterns` demonstrates the 44px controls, overflowing category row, and describes the single-scroller/container-query behavior. The production page, loading skeleton, and reusable POS components consume the same class contract.

## Testing

Source-contract regression tests cover the named containers, the 960px layout threshold, the 400–500px cart width, intrinsic category selection, touch-target classes, and narrow monetary rows. Verification consists of targeted tests, the full frontend suite, a production build, and `git diff --check`.
