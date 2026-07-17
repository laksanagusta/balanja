# Sales Report Page Polish Design

## Goal

Resolve every issue identified in the Emil Design Engineering, Apple Design, and Vercel Composition review of the Sales Report page while preserving its compact operational character and existing report behavior.

## Data integrity and agency

The displayed report and the filters that produced it must be one immutable snapshot. A successful response stores `{ data, resolvedFilters }`; exports and the transaction handoff use `resolvedFilters`, never the current draft or an unsuccessful request. Draft filters may differ from the displayed snapshot, but while they do, the UI visibly announces unapplied changes and disables actions whose meaning would otherwise be ambiguous.

A failed background refresh keeps the last successful snapshot readable and exposes a persistent inline warning in addition to transient feedback. It must never make the old report look as if it belongs to the failed filter request.

## Filter interaction

The toolbar behaves as a form. Enter submits custom filter changes, and the Apply action is enabled only when the draft differs from the resolved snapshot and the range is valid. Presets remain immediate actions, but their selected state uses a neutral segmented-control treatment rather than the primary checkout color.

On compact screens, buttons and form controls provide at least a 44px touch target while retaining the denser desktop visual size. Updating a report keeps the existing content fully legible; progress is communicated through status text instead of reducing the complete workspace to 60% opacity.

## Select accessibility

`SelectField` becomes an accessible anchored listbox. Its trigger is labelled, exposes `aria-haspopup="listbox"`, `aria-controls`, and expanded state. Closed options are not mounted or focusable. When open, Arrow keys move through options, Enter or Space selects, Escape closes and restores focus, and outside pointer interaction closes the list. Options expose selected state through listbox semantics.

Because `SelectField` is a shared primitive with existing uncommitted work, only the accessibility-specific hunk will be staged and committed; unrelated working-tree changes remain untouched.

## Chart semantics

The comparison series is dashed in both the legend and chart. Tooltip content uses Indonesian labels, localized dates, and Rupiah values. Persistent point markers remain absent; hover dots and tooltip inspection remain available.

## Composition

`ReportBreakdownPanels` contains only product, payment, and cashier breakdowns. `VoidReportPanel` is composed explicitly by callers; the `showVoids` boolean mode and redundant `voids` prop are removed.

## Design System synchronization

Before production component changes, `frontend/DESIGN.md` will record:

- report snapshots and actions always share resolved filters;
- report filter controls have neutral selection and compact-screen touch targets;
- background updates preserve content contrast;
- comparison trend and localized tooltip semantics;
- explicit void-panel composition without boolean modes.

The Design System already renders the production `SalesTrendPanel` and report components, so updating those shared production components updates the showcase without duplicating a separate visual implementation. Tests will assert this contract.

## Testing

- Controller-level tests cover draft/resolved filter divergence, successful resolution, failed refresh, and action filter selection.
- Toolbar source/behavior tests cover form submission, dirty-state messaging, neutral presets, touch targets, and disabled ambiguous actions.
- SelectField tests cover unmounted closed options and required keyboard/listbox semantics.
- Chart tests cover localized tooltip rows and a fully dashed comparison series.
- Composition tests reject `showVoids` and redundant void props.
- Run focused tests, the complete frontend suite, and the production build.

## Out of scope

- Redesigning report metrics or backend calculations.
- Changing report API contracts.
- Adding URL-synchronized report filters.
- Redesigning shared chart animation internals.
