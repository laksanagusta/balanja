# Navigation and Entry Points Design

## Goal

Give Balanja one predictable authenticated home, one explicit sales entry, and navigation whose grouping, labels, and consequences remain clear on desktop and mobile.

## Approved Direction

Dashboard is the authenticated home and the destination of the Balanja brand. The cashier workspace remains at `/pos`, presented as the direct task label `Kasir`. Barcode scanning belongs inside that cashier workspace because its result is a cart mutation; it must not be available globally while the cart is hidden.

The sidebar exposes meaningful groups instead of flattening every destination into one list:

- **Ringkasan:** Dashboard
- **Operasional:** Kasir, Produk, Stok
- **Catatan:** Transaksi
- **System:** Pengaturan, positioned near the account area rather than among daily work

All operational navigation labels use Indonesian to match the target UMKM audience and the existing public product language.

## Alternatives Considered

### Keep the global scanner and reveal the cart after every scan

This preserves fast access but still lets a global action unexpectedly change POS state from unrelated pages. It also forces navigation or a second global cart surface after success. The extra state coordination is not justified.

### Make Kasir the universal authenticated home

This favors cashiers, but conflicts with the existing owner-oriented landing and sign-in flow, which consistently promises Dashboard as the operational overview. It also makes the brand behave like a task button instead of a stable home anchor.

### Dashboard home with an explicit Kasir entry (selected)

This provides a familiar home, keeps the repeated cashier task one selection away, and allows scanner feedback to remain spatially connected to the cart it affects.

## Routing and Wayfinding

- Authenticated `/` resolves to `/dashboard`.
- The desktop and mobile Balanja brand navigates to `/dashboard`.
- Unknown authenticated paths resolve to `/dashboard`, keeping fallback behavior aligned with the home destination.
- `/pos` remains the cashier route and is labeled `Kasir` everywhere user-facing.
- Existing public and private access rules remain unchanged.

## Desktop Navigation

The sidebar renders visible group labels and neutral active states. Orange/primary styling is not used for navigation because the established design system reserves it for checkout or purchase completion. The global scanner button is removed.

Settings moves to a small system section above the account control. The account popover continues to own sign-out. Navigation retains immediate press feedback and a clear active destination.

## Mobile Navigation

The menu button receives an accessible name, `aria-expanded`, and `aria-controls`. Opening it presents an anchored overlay sheet above the current workspace rather than inserting a block that pushes content downward. A scrim closes the sheet, navigation closes it after selection, and Escape closes it without changing routes.

The sheet uses the same labels, grouping, ordering, and neutral active styling as desktop. The account control remains in the mobile header.

Reduced-motion users receive an opacity-only appearance; other users receive a short, restrained transform-and-opacity transition originating from the menu trigger side.

## Scanner Placement

The cashier page header gains a secondary `Pindai barcode` action. It opens the existing persistent scanner, loads product data through the existing store path, and adds detected products to the visible cashier cart. Success and failure continue to use toasts, and the scanner remains open until explicitly closed for repeated scanning.

The Products page keeps its form-local scanner because that scanner fills a barcode field rather than mutating the cashier cart.

## Actionable Dashboard Entry Points

Dashboard accepts `onNavigate` and passes a stock action to the low-stock panel. When low-stock products exist, the panel displays `Kelola stok`, navigating to `/stock`. The low-stock KPI remains informational rather than pretending the whole card is interactive.

This preserves a clear mapping: the dashboard identifies the issue, and a specific nearby control opens the workspace that resolves it.

## Design-System Synchronization

Before production components change:

- `frontend/DESIGN.md` documents the authenticated home, grouped navigation hierarchy, Indonesian labels, neutral navigation styling, mobile overlay behavior, scanner placement, and dashboard-to-stock entry point.
- `DesignSystemPage` gains a compact app-navigation pattern that shows the approved hierarchy and explains scanner locality and actionable dashboard handoff.
- The public POS mockup uses the same labels and grouping as production.

## Testing

Tests are written before implementation and cover:

- Authenticated unknown routes fall back to Dashboard.
- Navigation labels and groups match the approved hierarchy.
- The brand opens Dashboard on desktop and mobile.
- The global shell no longer owns or renders the barcode scanner.
- Mobile disclosure exposes its accessible name, expanded state, controlled sheet, scrim, and neutral active styling.
- Retail POS owns and renders the persistent cart scanner.
- Dashboard passes navigation into an actionable low-stock panel.
- Design documentation and showcase text describe the same structure.

After targeted tests pass, run the complete frontend tests, production build, lint if configured, and `git diff --check`.

## Non-Goals

- Role-based home destinations or role-specific navigation.
- Deep-linking a particular product into the stock movement dialog.
- Replacing the existing history API, POS store, scanner implementation, or authentication provider.
- Adding a global cart, breadcrumb system, or new routing library.
