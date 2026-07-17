# Sales Report Today Chart Fix Design

## Problem

The sales trend chart currently uses a human-readable label such as `17 Jul` as its time-series x-axis value. The shared chart parses its x-axis values as JavaScript dates, so this yearless display label is an ambiguous, implementation-dependent date input. The issue is most visible for the `Hari ini` preset, where the chart receives a single-point time domain and the report page can become blank during rendering.

The current-period line also renders persistent point markers. The desired visual treatment is a clean line without permanent dots while retaining the interactive hover highlight and tooltip.

## Design

### Canonical chart dates

`alignTrend` will expose a canonical ISO date property for every aligned point. It will use the current period's `bucket` (`YYYY-MM-DD`) and fall back to the previous period's bucket only if the current bucket is absent. Human-readable labels remain presentation data and will not drive the chart scale.

`SalesTrendPanel` will use the canonical ISO property as `xDataKey`. This gives the shared time-series chart a stable date input for a one-day period and for longer ranges without introducing a separate one-day rendering mode.

### Marker treatment

The current-period line will stop enabling persistent markers. The shared line component's hover highlight and chart tooltip remain enabled, so users can still inspect individual values interactively.

The production report component and its Design System showcase share the same `SalesTrendPanel`, so the visual change is represented in both places. `frontend/DESIGN.md` will explicitly state that sales-report trends use clean lines without persistent point markers and retain hover inspection.

## Error handling

The existing report loading and error states remain unchanged. This fix removes the invalid/ambiguous chart input at its source rather than catching a rendering failure or hiding the chart for one-day ranges.

## Testing

- Add a regression assertion that a one-day aligned trend exposes a canonical ISO chart date.
- Assert that `SalesTrendPanel` uses the canonical date property as its x-axis key.
- Assert that the report trend does not enable persistent markers.
- Run the focused report tests, full frontend test suite, and production build.

## Out of scope

- Changing backend report response fields.
- Redesigning the shared chart library.
- Removing hover highlights or tooltips.
- Adding a separate visualization for single-day reports.
