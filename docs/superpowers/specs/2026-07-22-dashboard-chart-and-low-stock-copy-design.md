# Dashboard chart and low-stock copy design

## Scope

Refine the operational dashboard in two focused places: the revenue trend visual
and the low-stock product list.

## Revenue trend

The dashboard revenue trend renders a clean monotone line without persistent
point markers. Its existing hover/touch tooltip remains available to inspect an
individual daily value. This reduces visual noise while retaining exact values
and accessible chart context.

## Low-stock list

Each low-stock product row keeps its name as the primary label and renders
`category · unit` as the muted subtitle directly below it. The existing `Sisa
{stock}` badge remains the sole stock-quantity signal, avoiding duplicated
values while preserving the context needed for restocking.

## Design-system synchronization

The dashboard showcase and `frontend/DESIGN.md` document the marker-free
dashboard revenue trend and low-stock row subtitle pattern. No data loading,
threshold, layout, or interaction behavior changes.

## Verification

Run the focused dashboard tests where available and `npm run build` in
`frontend/`. Check the dashboard at compact and wide widths to confirm the
subtitle truncates safely and the line still exposes its tooltip.
