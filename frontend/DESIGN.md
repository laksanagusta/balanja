# Design System

## Product Surface

Balanja is a retail point-of-sale surface for Indonesian UMKM shops. The interface should stay simple, dense, quiet, and fast for repeated cashier work: white surfaces, soft borders, compact controls, product-image cards, clear stock signals, and near-black primary checkout actions.

## Tokens

Color tokens live in `src/index.css` through Tailwind v4 `@theme`: `app-bg`, `surface`, `surface-muted`, `border`, `text`, `text-muted`, `accent`, `danger`, `success`, `warning`, and `focus`.

Typography uses the system sans stack through `--font-sans`. Operational text should stay between 12px and 17px. Page titles use 24px to 30px.

Spacing follows 4px-based Tailwind steps. Repeated panels use 24px gutters, cards use 12px to 16px internal padding, and controls use 40px to 48px heights.

Radius follows a three-step hierarchy: `control` is XS at 8px for buttons and tags; `card` is S at 12px for cards and inputs; `panel` is M at 16px for modals and panels. Pills remain fully rounded. Do not introduce larger radii unless the screenshot style changes.

Shadows are intentionally light: `low` for cards and controls, `panel` for the app shell, and `accent` only for primary orange actions.

Motion uses `--duration-fast`, `--duration-base`, and `--ease-standard`. Keep transitions short and functional. Transition only explicit, compositor-friendly properties such as transform and opacity; do not animate box shadows. Gate hover motion behind `(hover: hover) and (pointer: fine)`. Dialogs and the barcode scanner enter and exit over 200ms with backdrop opacity plus a centered surface scale from `0.98` to `1`; in reduced-motion contexts, remove the scale while retaining the opacity transition. Add-to-cart actions should respond on press and confirm completion with a brief product-card pulse or compact status chip, using transform and opacity so the workflow stays fast.

## Components

Reusable primitives are in `src/components/primitives.jsx`: `Button`, `Input`, `SelectField`, `Badge`, `Panel`, `Switch`, and `Icon`.

Toast feedback uses `sonner` with a single root `Toaster`. Use success toasts for completed cashier actions such as barcode scans, product saves, cart clearing, settings saves, and completed sales. Use error toasts for validation, stock, and payment failures.

An unknown barcode is an actionable exception, not a transient error. After an unsuccessful product scan, show a right-aligned-footer decision dialog with `Cancel`, `Scan again`, and `Add product`. The add-product action opens a compact product form with the scanned barcode prefilled; when saving succeeds, add the new product to the current cart automatically, confirm with a success toast, and reopen the scanner for the next item.

Buttons support primary, secondary, ghost, danger, disabled, and icon usage. Primary is reserved for checkout or purchase completion.

Cards and panels use tokenized borders, radii, shadows, and background colors. Product cards must keep product image first with a compact stock badge, category badge next, item name and IDR price next, and quantity/cart controls in a bordered footer.

Forms use visible labels, 42px controls, muted placeholder text, and focus outlines from the `focus` token. Validation stays inline beside the affected field with a danger border and concise error text; do not make cashiers infer an invalid field from a toast alone. Product prices must be at least `Rp1`. Use the controlled floating `SelectField` popover for finite option sets such as product category, not a native select. Product numeric fields use two columns at most: Price and Stock share one row, while Unit spans the full row beneath them.

## Layout

The POS app shell follows the installed `@efferd/app-shell-3` sidebar pattern with an inset navigation rail and direct content inset. Keep a consistent 8px inset on every outer edge, including the lower edge, so the sidebar and main panel read as one framed system. The shell sidebar and main content wrapper use the tighter `card` radius; reserve the larger `panel` radius for interior tool surfaces. The POS workspace inside that shell is a two-column layout: flexible product grid and 400px to 500px cart summary. Below desktop, columns stack while preserving the same component order.

Catalog and history pages share one operational pattern: a compact title-and-search header, then a bordered table panel with a concise title and supporting copy. Use the matching empty state inside that panel when the dataset or current search has no rows.

The login page lives at `/`, the production POS surface lives at `/pos`, and the component and token showcase lives at `/design-system` so future UI additions can compare against the working product screen without mixing routes.

The operational dashboard lives at `/dashboard` inside the shared app shell. It uses four compact KPI cards, a wide-primary/narrow-secondary chart row, then a top-products and low-stock row. Use rolling 7-day and 30-day periods; calculate metrics only from completed local POS transactions and show the established empty-state pattern when a period has no sales. Low stock means an active product with 10 units or fewer.

Dashboard charts must use the installed BKLIT registry components (`@bklit/line-chart`, `@bklit/pie-chart`, and `@bklit/bar-chart`) rather than hand-written SVG charts. Chart colors come from semantic variables such as `--chart-line-primary`, `--chart-bar-primary`, `--color-chart-cash`, `--color-chart-qris`, and `--color-chart-other`. Labels, legends, and supporting text must keep the data understandable without relying on color alone.

## Adding New UI

Use semantic tokens and existing primitives before adding raw Tailwind values. Keep retail operations screens compact and avoid hero-style layouts, decorative gradients, nested cards, and one-off shadows.

New pages should reuse the same sidebar, panel borders, form field height, card radius, and button variants unless there is a concrete product reason to diverge.

## Verification

Run `npm run build` from `frontend/`. For visual work, inspect desktop and mobile widths, and confirm no product card, button, nav item, cart row, or table text overflows its container.
