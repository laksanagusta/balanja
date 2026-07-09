# Design System

## Product Surface

Balanja is a retail point-of-sale surface for UMKM cashiers selling everyday goods quickly. The interface should stay dense, quiet, and scannable: white surfaces, soft borders, compact controls, clear product names, visible barcode/SKU details, Rupiah totals, and near-black primary checkout actions.

## Tokens

Color tokens live in `src/index.css` through Tailwind v4 `@theme`: `app-bg`, `surface`, `surface-muted`, `border`, `text`, `text-muted`, `accent`, `danger`, `success`, `warning`, and `focus`.

Typography uses the system sans stack through `--font-sans`. Operational text should stay between 12px and 17px. Page titles use 24px to 30px.

Spacing follows 4px-based Tailwind steps. Repeated panels use 24px gutters, cards use 12px to 16px internal padding, and controls use 40px to 48px heights.

Radius tokens are `control` at 10px, `card` at 12px, and `panel` at 20px. Do not introduce larger radii unless the screenshot style changes.

Shadows are intentionally light: `low` for cards and controls, `panel` for the app shell, and `accent` only for primary checkout actions.

Motion uses `--duration-fast`, `--duration-base`, and `--ease-standard`. Keep transitions short and functional.

## Components

Reusable primitives are in `src/components/primitives.jsx`: `Button`, `Input`, `SelectField`, `Badge`, `Panel`, `Switch`, and `Icon`.

Buttons support primary, secondary, ghost, danger, disabled, and icon usage. Primary is reserved for checkout or purchase completion.

Cards and panels use tokenized borders, radii, shadows, and background colors. Product tiles and rows must prioritize product name, barcode, price, stock, and category. Product imagery is optional and should not dominate retail checkout screens.

Forms use visible labels, 42px controls, muted placeholder text, and focus outlines from the `focus` token.

## Layout

The POS app shell uses an inset navigation rail and direct content inset. The production POS workspace is a retail checkout surface with a flexible product list/grid and a 400px payment/cart summary. Below desktop, columns stack while preserving fast access to cart and checkout.

Clerk owns the signed-out login experience, the production POS surface lives at `/pos`, product management lives at `/products`, transaction history lives at `/transactions`, settings lives at `/settings`, and the component/token showcase lives at `/design-system`.

## Adding New UI

Use semantic tokens and existing primitives before adding raw Tailwind values. Keep retail operations screens compact and avoid hero-style layouts, decorative gradients, nested cards, and one-off shadows.

New pages should reuse the same sidebar, panel borders, form field height, card radius, and button variants unless there is a concrete product reason to diverge.

## Verification

Run `npm run build` from `frontend/`. For visual work, inspect desktop and mobile widths, and confirm no product row/card, button, nav item, cart row, table, or modal text overflows its container.
