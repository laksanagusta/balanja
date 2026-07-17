# Design System

## Product Surface

Balanja is a retail point-of-sale surface for Indonesian UMKM shops. The interface should stay simple, dense, quiet, and fast for repeated cashier work: white surfaces, soft borders, compact controls, product-image cards, clear stock signals, and near-black primary checkout actions.

## Tokens

Color tokens live in `src/index.css` through Tailwind v4 `@theme`: `app-bg`, `surface`, `surface-muted`, `border`, `text`, `text-muted`, `accent`, `danger`, `success`, `warning`, and `focus`.

Typography uses the system sans stack through `--font-sans`. Operational text should stay between 12px and 17px. Page titles use 24px to 30px.

Spacing follows 4px-based Tailwind steps. Repeated panels use 24px gutters, cards use 12px to 16px internal padding, and controls use 40px to 48px heights.

Radius follows a three-step hierarchy: `control` is XS at 8px for buttons and tags; `card` is S at 12px for cards and inputs; `panel` is M at 16px for modals and panels. Pills remain fully rounded. Do not introduce larger radii unless the screenshot style changes.

Shadows are intentionally light: `low` for cards and controls, `panel` for elevated overlays and interior panels, and `accent` only for primary orange actions. The app shell itself stays shadow-free so its sidebar-content gap remains visually clean.

Motion uses `--duration-fast`, `--duration-base`, and `--ease-standard`. Keep transitions short and functional. Transition only explicit, compositor-friendly properties such as transform and opacity; do not animate box shadows. Gate hover motion behind `(hover: hover) and (pointer: fine)`. Dialogs and the barcode scanner enter and exit over 200ms with backdrop opacity plus a centered surface scale from `0.98` to `1`; in reduced-motion contexts, remove the scale while retaining the opacity transition. Add-to-cart actions should respond on press and confirm completion with a brief product-card pulse or compact status chip, using transform and opacity so the workflow stays fast.

Loading skeletons should mirror the final retail layout instead of showing generic bars alone. Use full-page skeletons only before a page has initial data. Once settled content exists, refetches and filter loads should preserve the current layout, keep controls usable, soften the affected content with opacity, and show a compact `Updating` indicator near the affected header instead of replacing content with skeletons. Disable controls only for explicit pending mutations such as save, checkout, or destructive confirmation, not for background refetches. For POS surfaces, reveal initial skeleton cards and order-summary blocks with a short 560ms rise-in and a looping horizontal sheen that travels across each placeholder in roughly 1.5s. Apply the same motion language to dashboard cards, catalog tables, transaction lists, and settings forms so every data-driven page feels consistent. Keep the shimmer subtle, use surface-muted tones plus a soft white highlight, and disable both the rise and shimmer in reduced-motion contexts.

## Components

Reusable primitives are in `src/components/primitives.jsx`: `Button`, `Input`, `SelectField`, `Badge`, `Panel`, `Switch`, and `Icon`.

Switch defaults to the neutral accent tone for generic settings. Use the success tone for product availability and active/inactive states so enabled inventory reads as healthy/available rather than merely selected.

Toast feedback uses `sonner` with a single root `Toaster`. Use success toasts for completed cashier actions such as barcode scans, product saves, cart clearing, settings saves, and completed sales. Use error toasts for validation, stock, and payment failures.

An unknown barcode is an actionable exception, not a transient error. After an unsuccessful product scan, show a right-aligned-footer decision dialog with `Cancel`, `Scan again`, and `Add product`. The add-product action opens a compact product form with the scanned barcode prefilled; when saving succeeds, add the new product to the current cart automatically, confirm with a success toast, and reopen the scanner for the next item.

Buttons support primary, secondary, ghost, danger, disabled, and icon usage. Primary is reserved for checkout or purchase completion.

Cards and panels use tokenized borders, radii, shadows, and background colors. Product cards must keep product image first with a compact stock badge, category badge next, item name and IDR price next, and quantity/cart controls in a bordered footer.

Forms use visible labels, 42px controls, muted placeholder text, and focus outlines from the `focus` token. Validation stays inline beside the affected field with a danger border and concise error text; do not make cashiers infer an invalid field from a toast alone. Product prices must be at least `Rp1`. Use thousand separators for product price and stock inputs while sending plain numeric values to the API. Use the controlled floating `SelectField` popover for finite option sets such as product category, not a native select. Header-level `SelectField` controls may hide the visual label with an accessible sr-only label so compact page headers keep one aligned control row. Product numeric fields use two columns at most: Price and Stock share one row, while Unit spans the full row beneath them.

Search fields must keep typing immediate while debouncing expensive filtering or API work by roughly 220ms. Apply this to POS product search, catalog search, transaction search, stock movement search, and searchable pickers so cashier feedback stays direct without sending unnecessary queries.

## Layout

The POS app shell follows the installed `@efferd/app-shell-3` sidebar pattern with an inset navigation rail and direct content inset. Keep a consistent 8px inset on every outer edge, including the lower edge, so the sidebar and main panel read as one framed system. The shell wrapper, sidebar, and main content panel stay shadow-free; sidebar and main use their own borders and `card` radius so the 8px gap remains clean on every edge. Reserve the larger `panel` radius and `panel` shadow for elevated overlays and interior tool surfaces. The POS workspace inside that shell is a two-column layout: flexible product grid and 400px to 500px cart summary. Below desktop, columns stack while preserving the same component order.

Catalog and history pages share one operational pattern: a compact title-and-search header, then a bordered table panel with a concise title and supporting copy. Search controls update their visible input immediately and debounce filtering work. Use the matching empty state inside that panel when the dataset or current search has no rows.

Operational tables support sorting only on columns that change the user's working order. Product tables sort by product name, category, price, and stock; transaction tables sort by transaction number, time, payment method, and total; stock movement tables sort by date, product, type, delta, and resulting stock. Do not make identifier-only, audit, status, reason, user, reference, or action columns sortable unless a page has a concrete workflow that needs that order.

Operational table pagination is server-controlled and cursor-based. Use Previous and Next only; do not show an exact total unless the server actually computes one. Search remains immediate with a 220ms server debounce. Filter, sort, or page-size changes reset to the first cursor. Preserve settled rows during requests and show `Updating` instead of replacing the table with a skeleton. Page-size options are 20, 50, and 100.

Products exposes inline category and active-status filters. Transactions keeps search visible and places payment method plus date range in the anchored, non-modal `TableFilterPopover`; show the active-filter count on its trigger. Stock keeps search and movement type inline. The Products catalog owns its server page locally and must never replace the shared POS product cache. Product mutations refresh both the current catalog page and the shared cache through separate paths. Transactions and Stock history rows are page-local and must not be stored globally as if one cursor page were the complete collection.

The Stock page follows the same operational table pattern and sits between Products and Transactions in the sidebar. It loads shared products for movement actions while movement history stays in a page-local server query. Keep stock search, movement type, and `New movement` in the compact page header; do not add a separate filter modal unless there are more high-value filters. Use a full skeleton only before initial stock movement data exists; refetches should preserve the table and show a compact updating indicator. Manual movement dialogs require product, movement type, quantity, and reason, then preview current stock, signed delta, and stock after before submit. Product selection uses a debounced searchable picker backed by the products API with a six-item result limit; product rows expose name, barcode, category, and unit, while current stock appears only in the preview metrics to avoid duplicate stock reads. Positive stock deltas use the success tone, sale/reduce deltas use danger text, and set-exact movements use a neutral type badge with signed delta text. Quantity inputs show thousand separators in the UI and submit plain integers to the API.

The login page lives at `/`, the production POS surface lives at `/pos`, and the component and token showcase lives at `/design-system` so future UI additions can compare against the working product screen without mixing routes.

The operational dashboard lives at `/dashboard` inside the shared app shell. It uses four compact KPI cards, a wide-primary/narrow-secondary chart row, then a top-products and low-stock row. Use rolling 7-day and 30-day periods; calculate metrics only from completed local POS transactions and show the established empty-state pattern when a period has no sales. Low stock means an active product with 10 units or fewer.

Dashboard charts must use the installed BKLIT registry components (`@bklit/line-chart`, `@bklit/pie-chart`, and `@bklit/bar-chart`) rather than hand-written SVG charts. Use the Balanced Vivid chart palette only on data marks: violet (`--color-chart-violet`) for the revenue line and Cash, green (`--color-chart-green`) for top-product bars, mint (`--color-chart-mint`) for QRIS, and amber (`--color-chart-amber`) for Other. Keep panels white, grids neutral, and tooltips dark; do not add colored panel tints, gradients, glow, or decorative area fills. Labels, legends, markers, and supporting values must keep the data understandable without relying on color alone.
Bar-chart axis labels must fit within the nearest bar-center spacing. Cap label width and use an ellipsis on compact charts so adjacent product names never overlap; keep the full label in the DOM and chart tooltip so truncation is visual only.

## Adding New UI

Use semantic tokens and existing primitives before adding raw Tailwind values. Keep retail operations screens compact and avoid hero-style layouts, decorative gradients, nested cards, and one-off shadows.

New pages should reuse the same sidebar, panel borders, form field height, card radius, and button variants unless there is a concrete product reason to diverge.

## Public Marketing Pages

The public landing page lives at `/`; Clerk sign-in lives at `/login`. Public pages may use the spacious editorial composition documented by the Marketing page patterns showcase. Marketing rules do not apply to operational screens.

Marketing display headings use 40px to 48px on mobile and 64px to 72px on wide screens, with a tight 0.98 to 1.04 line height. Keep hero headlines to two or three lines. Major section spacing scales from 80px on mobile to 112px on tablet and 144px on wide screens.

Use the existing semantic palette, 8px/12px/16px radius hierarchy, soft borders, near-black primary CTA, and bordered secondary CTA. Product visuals may use real current Balanja screenshots or faithful UI mockups built from the same tokens and information architecture. Hero mockups use a stable landscape frame, may sit over a restrained retail photograph, and must preserve readable product hierarchy without inventing capabilities. When a manual screenshot replaces a mockup, include intrinsic dimensions, descriptive alt text, and a muted failure fallback.

Public navigation keeps the logo and authentication action visible on mobile; secondary anchor links may collapse or hide below the medium breakpoint. Marketing compositions stay open and flat—do not introduce nested cards or apply enlarged typography and spacing to POS, dashboard, catalog, stock, transactions, settings, or dialogs.

## Sales reports

Sales reports use inclusive local calendar dates in WIB and compare every selected period with the immediately preceding period of equal length. Presets cover Hari ini, 7 hari, 30 hari, and Bulan ini; custom ranges allow at most 366 days and expose validation beside the date control.

Sales-report trend charts use clean lines without persistent point markers. Hover highlights and tooltips remain available for inspecting individual values.

The report workspace retains settled content during refetch, softens only the affected report panels, and announces `Memperbarui` through a polite status region. Initial loading mirrors the final layout with six metric blocks, a separate void block, a wide trend, and three breakdown panels. Mobile layouts stack controls, metrics, charts, and tables without hiding information.

The six primary metrics are Penjualan bersih, Pajak, Total diterima, Transaksi selesai, Item terjual, and Rata-rata transaksi. Each includes an equal-period comparison; a zero prior value reads `Tidak ada data pembanding`. Voided transactions are always separate and never contribute to completed-sale metrics.

Product breakdown value is penjualan bersih from harga snapshot × kuantitas. Transaction-level tax must never be allocated to products. Cashier rows group by stable user id, show the latest nonblank snapshot name, and fall back visibly to `Pengguna <short-id>`. Daily and transaction CSV actions have unique accessible names, preserve the current filters, remain keyboard reachable with visible focus, and disable only the export currently in progress.

## Verification

Run `npm run build` from `frontend/`. For visual work, inspect desktop and mobile widths, and confirm no product card, button, nav item, cart row, or table text overflows its container.
