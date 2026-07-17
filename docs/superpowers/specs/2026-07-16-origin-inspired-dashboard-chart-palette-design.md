# Origin-Inspired Dashboard Chart Palette Design

## Goal

Make the operational dashboard charts more distinctive and engaging by adopting the light, colorful character seen in Origin Financial's spending views while preserving Balanja's restrained white surfaces, existing information hierarchy, and accessible data reading.

## Approved Direction

Use a balanced vivid palette. Color belongs to the data marks—not to the panel backgrounds—so the dashboard remains calm while the charts gain a stronger visual identity.

The approved palette is:

| Semantic role | Color | Usage |
| --- | --- | --- |
| Chart violet | `#7867E6` | Revenue line, Cash slice, primary chart emphasis |
| Chart green | `#36A875` | Top-products bars |
| Chart mint | `#5BBF9A` | QRIS slice |
| Chart amber | `#E7A83E` | Other-payment slice |

These are Balanja-owned semantic colors inspired by the overall Origin Financial light-chart character; they do not reproduce Origin's full brand system.

## Component Mapping

### Revenue Trend

- Replace the near-black primary line with chart violet.
- Keep the 2.5px stroke, monotone-X curve, visible markers, neutral grid, and existing tooltip behavior.
- Marker treatment must remain legible against the white chart surface and must not rely on glow.

### Top Products

- Replace the near-black bars with chart green.
- Keep the rounded line caps, neutral grid, axis labels, and tooltip values.
- All bars in this ranking remain one semantic series color; do not assign arbitrary colors per product.
- On compact charts, cap each axis label to the nearest bar-center spacing and show an ellipsis instead of allowing adjacent product names to overlap. Keep the full label available to assistive technology and the chart tooltip.

### Payment Mix

- Map Cash to violet, QRIS to mint, and Other to amber.
- Preserve the visible legend labels and percentages so payment methods are not identified by color alone.
- Keep slice spacing, corner radius, hover growth, and the center total unchanged.

## Surfaces and Hierarchy

Chart panels remain white with existing border, radius, and shadow tokens. Grid lines, axes, labels, empty states, tooltip surfaces, KPI cards, and page chrome remain unchanged. No gradient panel backgrounds, colored glows, or decorative fills are introduced.

This keeps color focused on the financial data and prevents the dashboard from competing with primary operational actions.

## Design-System Changes

- Add semantic palette tokens in `frontend/src/index.css` for violet, green, mint, and amber chart roles.
- Point `--chart-line-primary`, `--chart-bar-primary`, and the payment-method tokens to the approved roles.
- Update the color-token inventory in `frontend/src/data.js`.
- Update the dashboard chart contract in `frontend/DESIGN.md`.
- Keep `DashboardPatternsShowcase` as the visual reference for the production mapping.

Token names must express chart roles rather than the Origin brand name. Production components continue consuming semantic CSS variables instead of hard-coded hex values.

## Accessibility and Web Guidelines

- Retain text labels, numeric values, markers, and legends; color is supplementary.
- Keep current focus-visible behavior and keyboard-accessible period controls unchanged.
- Preserve reduced-motion behavior already provided by the chart components.
- Use the existing dark tooltip with high-contrast text.
- Do not add animation properties beyond transform and opacity or introduce `transition: all`.
- Verify the four chart colors remain distinguishable on the white surface and that legend text retains its current contrast.

The reviewed `DashboardPage.jsx` structure has no blocking Web Interface Guidelines finding for this color-only scope.

## Data and Behavior

No analytics calculations, API requests, chart geometry, interactions, empty states, or loading behavior change. The existing server-provided data and payment labels remain the source of truth. The only responsive adjustment is width-aware visual truncation for crowded bar-axis labels.

## Testing and Verification

- Add a source-contract test for the approved semantic token values and chart-role mappings.
- Verify the production chart components still consume semantic variables rather than hex values.
- Keep existing dashboard analytics and chart geometry tests passing.
- Run the full frontend test suite, production build, and `git diff --check`.
- Review the Dashboard Patterns showcase and `/dashboard` at desktop and compact widths for legibility and visual balance.

## Non-Goals

- Copying Origin Financial's complete brand identity.
- Adding dark mode or changing existing dark-theme chart fallbacks.
- Adding gradients, area fills, glow effects, or new chart animations.
- Changing chart types, panel layout, data aggregation, full label content, or tooltip behavior.
- Recoloring KPI cards, status colors, navigation, or primary actions.
