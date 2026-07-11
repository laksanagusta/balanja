# Balanja Operational Dashboard Design

## Goal

Add a responsive operational dashboard for the Balanja retail POS. The dashboard should follow the information hierarchy and density of the supplied reference while remaining consistent with Balanja's light, compact design system. It must use live local POS data and BKLIT UI chart components.

## Scope

- Add a signed-in `/dashboard` route and make Dashboard the first sidebar destination.
- Keep `/pos` as the cashier workspace; signing in may continue to enter the POS unless separately changed.
- Derive dashboard metrics from `store.transactions` and `store.products`.
- Add dashboard chart patterns to `/design-system` and document the new tokens and usage rules in `DESIGN.md`.
- Do not add backend APIs, remote analytics, forecasting, exports, or custom date pickers.

## Information Architecture

The dashboard uses the existing `AppShell`. Its content is a vertically scrollable operational surface with a compact header and four zones:

1. Header with title, store context, and a 7-day/30-day segmented period control.
2. Four KPI cards: revenue, completed transactions, average transaction value, and low-stock product count.
3. Primary row with a wide revenue trend chart and a smaller payment-method donut chart.
4. Secondary row with a top-products bar chart and a low-stock action panel.

Desktop uses a 12-column layout matching the reference's wide-primary/narrow-secondary rhythm. Tablet and mobile collapse charts into one column; KPI cards use two columns where space permits and one column at narrow widths.

## Data Model and Aggregation

A focused dashboard analytics module will expose pure functions so calculations can be tested without rendering React.

- Only transactions whose status is `completed` contribute to revenue and transaction metrics.
- The selected period is a rolling 7 or 30 calendar days ending today.
- Revenue is the sum of transaction `total` values in the selected period.
- Completed transactions is the count of included transactions.
- Average transaction value is revenue divided by completed transaction count, or zero when empty.
- Revenue trend groups revenue by local calendar date and fills missing dates with zero.
- Payment mix groups completed transactions by normalized `paymentMethod` and reports amount plus percentage.
- Top products aggregate item quantity and revenue by `productId`, then return the five highest quantities.
- Low stock means an active product with stock at or below 10 units. Results sort by stock ascending and show up to five products.

KPI comparisons use the immediately preceding equal-length period. When the prior value is zero, the UI shows neutral supporting text instead of a misleading percentage.

## Components

### DashboardPage

Owns the selected period, reads the POS store, requests aggregates, and composes the dashboard sections. It does not contain aggregation logic.

### Dashboard KPI Card

Reuses the existing panel, badge, icon, typography, and number formatting conventions. It supports label, value, icon, comparison text, and semantic comparison tone. This pattern is also shown on `/design-system`.

### Chart Panel

A shared panel header provides title, concise description, optional badge, and optional action. Chart bodies use BKLIT UI components installed through the registry:

- `@bklit/line-chart` for revenue trend.
- `@bklit/pie-chart` with an inner radius for payment mix.
- `@bklit/bar-chart` for top products.

BKLIT-generated components live in the project's component directory and are styled through Balanja chart CSS variables. Tooltips format currency and counts in Indonesian locale. Chart panels retain readable labels and do not rely on color alone.

### Low Stock Panel

Uses existing `Panel`, `Badge`, `Button`, and `Icon` primitives. Each row contains product name, category/unit context, current stock, and warning status. Its action navigates to `/products`.

### Empty States

With no completed transactions, revenue, payment, and top-product chart panels display the existing `EmptyState` pattern with concise guidance. KPI values remain truthful zeros. Low stock remains independent and continues to show current inventory risk.

## Design-System Contract

The dashboard stays within the existing neutral palette and spacing/radius hierarchy. The reference informs density, card arrangement, and hierarchy, not its dark theme.

Add semantic chart tokens for primary line/fill, secondary series, grid, tooltip surface, and categorical payment colors. Chart components must consume these variables rather than raw repeated colors. Dashboard panels use the existing `card` or `panel` radius, subtle border, and no decorative gradients.

`/design-system` gains a Dashboard Patterns section containing a KPI example and representative line, donut, and bar charts using static fixtures. `DESIGN.md` records the dashboard layout, data-display rules, chart tokens, empty-state behavior, and BKLIT component requirement.

## Interaction and Accessibility

- The period control is keyboard reachable and communicates its selected state.
- Chart panels have text titles and descriptions; visual marks are supplementary.
- Tooltips are available for pointer interaction without hiding essential totals.
- Warning and comparison states use icon/text labels in addition to color.
- Focus rings use the existing `focus` token.
- Motion remains short and functional and respects reduced-motion preferences.

## Error Handling

Aggregation functions tolerate missing arrays, invalid dates, missing item arrays, unknown payment methods, and numeric values stored as strings. Invalid transactions are excluded rather than crashing the page. Unknown payment methods group under `Other`.

If a BKLIT chart cannot render because the series is empty, the page renders the product empty state instead of mounting the chart with invalid dimensions or values.

## Testing and Verification

- Unit-test date windows, previous-period comparison, revenue totals, payment grouping, product aggregation, and low-stock sorting.
- Run the existing test suite and production build.
- Inspect `/dashboard` and `/design-system` at desktop and mobile widths.
- Confirm sidebar navigation, period switching, chart tooltips, empty states, long product names, and no horizontal overflow.
- Preserve unrelated working-tree changes and avoid broad refactors.

## Acceptance Criteria

- `/dashboard` is reachable from the signed-in shell and visually matches Balanja's design system.
- Every metric is derived from current POS state and responds to the 7/30-day control.
- Revenue, payment, and top-product charts use BKLIT UI registry components.
- Empty datasets produce useful empty states and never fabricated analytics.
- Low-stock items link users toward product management.
- Dashboard patterns are visible on `/design-system`, and `DESIGN.md` is synchronized.
- Tests and production build pass, with desktop and mobile layouts visually verified.
