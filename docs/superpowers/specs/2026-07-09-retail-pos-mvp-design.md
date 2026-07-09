# Retail POS MVP Design

Date: 2026-07-09
Status: Approved for implementation planning

## Summary

Build a simple, minimalist, superfast retail POS MVP for Indonesian UMKM. The app will evolve from the current restaurant POS prototype into a retail cashier workflow with real Clerk authentication, camera barcode scanning, local browser persistence, and four operational pages: POS, Products, Transactions, and Settings.

The MVP is hybrid: authentication is real through Clerk, while products, cart, transactions, and settings are stored in localStorage. This keeps the first iteration fast enough to validate cashier UX before adding a backend.

## Goals

- Make daily retail checkout fast on desktop/laptop cashier devices.
- Support camera barcode scanning for adding items to cart.
- Support camera barcode scanning when creating or editing products.
- Provide product CRUD for small retail catalogs.
- Record transaction history locally.
- Support Cash and manual QRIS payment methods.
- Keep the UI simple, minimal, responsive, and aligned with `DESIGN.md`.
- Fit UMKM retail, not restaurant table ordering.

## Non-Goals

- No backend database in this MVP.
- No payment gateway integration.
- No real inventory reporting page.
- No role-based authorization.
- No supplier, customer, loyalty, void, refund, or full accounting workflows.
- No CSV import/export in the first implementation.
- No receipt printer integration in the first implementation.

## Current Project Context

The project is a React + Vite + Tailwind v4 frontend. It currently has:

- Manual route handling in `src/App.jsx`.
- A restaurant-oriented `src/pages/PosPage.jsx`.
- A staff login prototype in `src/pages/LoginPage.jsx`.
- A design system reference page at `/design-system`.
- Shared primitives in `src/components/primitives.jsx`.
- Restaurant demo data in `src/data.js`.
- Design guidance in `DESIGN.md`.

The workspace is not currently a Git repository, so the design document cannot be committed from this folder unless Git is initialized or the folder is moved into a repository.

## Product Scope

Authenticated app pages:

- POS
- Products
- Transactions
- Settings

Internal/reference page:

- Design System

The `DESIGN.md` direction remains valid for density, quiet surfaces, compact controls, restrained shadows, and responsive verification. The domain needs to change from restaurant to retail UMKM, including Rupiah prices, retail categories, and product-first workflows.

## Authentication

Use Clerk for real authentication.

Implementation requirements:

- Install and configure `@clerk/react`.
- Add `VITE_CLERK_PUBLISHABLE_KEY` to the Vite environment.
- Wrap the app with `ClerkProvider`.
- Protect operational pages behind signed-in state.
- Show a Clerk account/user control in the app shell.
- All signed-in users have the same permissions in this MVP.

Signed-out users should see a Clerk login experience. Signed-in users should land on POS by default.

## Data Model

Local browser state should be managed through one app-level state provider or hook. It should own localStorage read/write, seed data, validation, and mutations.

Product:

- `id`
- `name`
- `barcode`
- `category`
- `price`
- `stock`
- `unit`
- `active`
- `createdAt`
- `updatedAt`

Cart item:

- `productId`
- `name`
- `barcode`
- `price`
- `qty`
- `stockAtAdd`

Transaction:

- `id`
- `number`
- `createdAt`
- `cashierName`
- `items`
- `subtotal`
- `tax`
- `total`
- `paymentMethod`
- `cashReceived`
- `changeDue`
- `status`

Settings:

- `storeName`
- `storeAddress`
- `taxEnabled`
- `taxRate`
- `qrisLabel`

Seed data should use Indonesian retail examples such as rice, sugar, instant noodles, bottled drinks, snacks, soap, and household products.

## POS Flow

The POS page is the main workspace after login.

Desktop/laptop layout:

- Left: product search, category filter, scan action, and fast product list/grid.
- Right: cart, totals, payment controls, and checkout action.

Cashier flow:

1. Cashier searches, clicks a product, or opens camera scan.
2. Camera scan reads a barcode.
3. If the barcode matches an active product with stock, the item is added to cart.
4. If the barcode does not match, the app offers to create a product using that barcode or input a barcode manually.
5. Cart supports quantity change, remove item, and clear cart.
6. Checkout supports Cash or QRIS.
7. Cash requires amount received and shows change due.
8. QRIS is recorded as a manual payment method without gateway integration.
9. Successful checkout creates a transaction, decrements stock, and clears the cart.

Stock rules:

- Products with `stock <= 0` cannot be added.
- Cart quantity cannot exceed current product stock.
- Checkout is blocked if any item exceeds available stock.
- Product stock is decremented only when checkout succeeds.

## Barcode Scanner

The barcode scanner is a reusable modal or panel used by POS and Products.

Behavior:

- Requests camera access only when opened.
- Shows a clear scanning state.
- Stops camera stream when closed.
- Returns the scanned barcode to the caller.
- Supports manual barcode input fallback.

Error handling:

- Camera permission denied: show manual input fallback.
- Camera unavailable: show manual input fallback.
- Scan timeout or unreadable barcode: keep scanner open and allow manual input.
- Duplicate product barcode in Products: block save and show an error.

Implementation may use a proven browser barcode library rather than hand-rolling scanning.

## Products Page

Products is the product management surface.

Required capabilities:

- Search by name or barcode.
- Filter by category and active/low/out-of-stock state.
- Add product.
- Edit product.
- Soft-delete product by setting `active=false`.
- Scan barcode into the product form.

Product form fields:

- Name
- Barcode
- Category
- Price
- Stock
- Unit
- Active status

The form should validate:

- Name is required.
- Barcode is required and unique among active products.
- Price must be zero or greater.
- Stock must be zero or greater.
- Category is required.

## Transactions Page

Transactions is a lightweight history page, not a full reporting system.

Table columns:

- Transaction number
- Time
- Item count
- Total
- Payment method
- Cashier
- Status

Detail panel:

- Transaction metadata.
- Item list with quantity and subtotal.
- Subtotal, tax, total.
- Cash received and change for Cash payments.
- Payment method for QRIS transactions.

Status:

- `completed`

Voids, refunds, partial voids, and accounting adjustments are out of scope.

## Settings Page

Settings stays intentionally small.

Fields:

- Store name
- Store address
- Tax enabled
- Tax rate
- QRIS label

Actions:

- Save settings locally.
- Reset demo data after confirmation.

Settings should not replace Clerk account management. Clerk user controls stay in the app shell.

## UI and Responsiveness

The UI must follow `DESIGN.md`:

- Dense, quiet, scannable interface.
- White surfaces.
- Soft borders.
- Compact controls.
- No hero layout in the app.
- No decorative gradients or marketing composition.
- No nested cards.
- Touch targets around 40-44px where practical.

Retail UI changes:

- Use Rupiah prices.
- Product cards/lists prioritize name, barcode, category, price, and stock.
- Product images are optional and should not dominate the POS screen.
- Use retail categories instead of restaurant categories.

Responsive behavior:

- Desktop/laptop: sidebar, two-column POS, sticky cart/payment area.
- Tablet: compact navigation, dense product grid, cart still reachable without long scrolling.
- Mobile: compact navigation, one-column product list, cart/checkout as a clear separate panel or section.

## Component Boundaries

Planned boundaries:

- `AppShell`: navigation, user area, route frame.
- `ProtectedApp`: Clerk signed-in guard and signed-out login routing.
- `POSPage`: retail checkout composition.
- `ProductsPage`: product table, filters, form modal.
- `TransactionsPage`: history table and detail panel.
- `SettingsPage`: store and payment settings.
- `BarcodeScanner`: reusable camera scanner and manual fallback.
- `usePOSStore` or app state provider: products, cart, transactions, settings, localStorage persistence.

The existing `PosPage.jsx` is already large, so implementation should split retail POS behavior into focused components and hooks rather than expanding one file further.

## Error Handling

Required user-facing errors:

- Camera permission denied or unavailable.
- Barcode not found.
- Barcode duplicate.
- Out-of-stock product.
- Cart quantity exceeds stock.
- Empty cart checkout.
- Cash received is less than total.
- localStorage data is unreadable.

For corrupt localStorage, the app should recover with retail seed data and show a lightweight notification or inline warning.

## Verification

Run:

```bash
npm run build
```

Manual checks:

- Signed-out users cannot access POS pages.
- Signed-in users can access POS, Products, Transactions, and Settings.
- Product CRUD persists after refresh.
- Product scan fallback works without camera permission.
- POS scan fallback works without camera permission.
- Checkout with Cash records transaction, change, and stock decrement.
- Checkout with QRIS records transaction and stock decrement.
- Out-of-stock products cannot be added to cart.
- Product changes appear in POS.
- Transactions show correct totals.
- Desktop, tablet, and mobile layouts do not overlap or overflow.

## Approved Decisions

- Approach: MVP operational ringan.
- Auth: Clerk real auth.
- Persistence: localStorage for MVP.
- Barcode: camera scanner first, with manual fallback.
- Pages: POS, Products, Transactions, Settings.
- Payment: Cash and manual QRIS.
- Product management: CRUD plus barcode scan in form.
- Roles: all signed-in users have equal access.
- Primary device: desktop/laptop cashier-first.
