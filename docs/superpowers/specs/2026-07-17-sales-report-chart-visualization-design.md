# Sales Report Chart Visualization Design

## Status

Approved approach: extend the shared time-series chart with explicit display labels and full-series dash styling, then consume those capabilities from the sales report.

This specification supersedes the visualization details in `2026-07-17-sales-report-today-chart-fix-design.md`. The earlier fix correctly moved the scale to canonical timestamps, but it did not preserve hourly labels and used a projection-tail dash mechanism for a comparison series.

## Problem

The sales report API returns daily buckets for multi-day periods and 24 hourly buckets for a one-day period. `SalesTrendPanel` correctly uses canonical bucket timestamps for its time scale, but the shared chart regenerates every visible x-axis label as a short date. For `Hari ini`, all hourly buckets therefore collapse visually into the same `Jul 17` label even though the plotted line contains 24 distinct values.

The previous-period series is currently made dashed with `dashFromIndex={0}`. That API is designed for a solid historical line followed by a dashed projection tail. Applying it at index zero to a comparison series is semantically wrong and produces unstable or clipped-looking paths.

The chart also derives height from a wide aspect ratio. On large desktop viewports this creates an oversized panel with excessive empty space, weakens proximity between the title and data, and makes small hourly changes harder to read.

## Design principles

- **Truthful representation:** geometry uses canonical timestamps; display labels preserve the source granularity.
- **Spatial consistency:** current and previous periods share the same relative hourly or daily positions.
- **Restraint:** the chart stays compact, uses no permanent dots, and avoids decorative motion or redundant labels.
- **Predictability:** solid always means the selected period and dashed always means the immediately preceding equal-length period.
- **Accessibility:** tooltip values remain available without relying on color alone; the dash pattern differentiates the comparison series.

## Shared chart capabilities

### Explicit display labels

`LineChart` will accept an optional `xLabelKey`. The canonical `xDataKey` continues to drive scale, ordering, interaction, and animation. When `xLabelKey` is present, the chart context's `dateLabels` uses that field instead of formatting the canonical timestamp itself.

This keeps data semantics separate:

- `xDataKey="date"` controls position.
- `xLabelKey="label"` controls visible axis and hover labels.

Charts that do not provide `xLabelKey` keep the existing short-date behavior.

### Full-series dash styling

`Line` will accept an optional `strokeDasharray`. It applies to the complete visible line in both static and animated rendering paths. It is independent from `dashFromIndex`, which remains reserved for projection tails.

The report comparison line will use `strokeDasharray="6 5"` and remove `dashFromIndex`.

## Sales report behavior

### One-day period

The backend's 24 hourly buckets remain unchanged. The chart plots them by their ISO timestamps and shows Indonesian 24-hour labels such as `00.00`, `06.00`, `12.00`, `18.00`, and `23.00`, with the shared axis selecting an uncluttered subset.

The tooltip title combines the selected date and hour, for example `17 Jul · 14.00`. Rows remain `Periode ini` and `Periode sebelumnya`, formatted as Rupiah.

### Multi-day period

The chart plots daily ISO dates and uses the backend's localized day labels. The tooltip title remains a localized full date. Current and previous values align by relative position, so day one compares with day one even though their calendar dates differ.

### Visual treatment

- Current period: 2.5px purple solid line.
- Previous period: 1.75px muted gray dashed line.
- Permanent and hover dots: disabled.
- Horizontal grid: subtle and unchanged.
- Height: 260px on compact layouts and 320px from medium screens upward, independent of viewport width.
- Empty state: unchanged when both aligned series contain no received value.

## Component boundaries

- `LineChart` forwards `xLabelKey` to the time-series shell.
- The time-series shell resolves display labels without changing scale or interaction data.
- `Line` owns full-series dash rendering.
- `SalesTrendPanel` selects report-specific labels, tooltip copy, line styles, and responsive height.
- `alignTrend` continues to align current and previous values by relative index and preserves canonical buckets.

## Design-system synchronization

Before production component changes, `frontend/DESIGN.md` and the report Design System showcase will document and demonstrate:

- hourly labels for a one-day range;
- daily labels for longer ranges;
- solid current and fully dashed comparison lines;
- no dots;
- compact bounded chart height.

## Testing

- Unit-test label resolution with and without `xLabelKey`.
- Assert the full-line renderer receives `strokeDasharray` in static and animated paths.
- Assert `SalesTrendPanel` uses `xDataKey="date"`, `xLabelKey="label"`, full-series dash styling, no dot rendering, and bounded height.
- Cover hourly tooltip-title formatting separately from daily formatting.
- Run focused chart/report tests, the full frontend suite, and the production build.

## Out of scope

- Changing backend aggregation or response fields.
- Converting hourly totals into cumulative revenue.
- Adding a y-axis component to the shared chart library.
- Redesigning report filters, metric cards, or breakdown tables.
- Adding permanent markers, area fills, zooming, brushing, or gesture interactions.
