# Cart row action layout design

## Goal

Improve the scanability and safety of each POS cart row by separating the
destructive remove action from the frequently used quantity control.

## Layout

The product identity and row subtotal remain in the top row. A second action
row sits below them: the labelled `Hapus` action aligns to inline-start, while
the decrement, quantity, and increment control aligns to inline-end. On narrow
widths the action row retains both controls on one flexible, wrapping-safe line.

## Interaction

Quantity remains the primary repeated action and retains its immediate press
feedback, accessible labels, stock-limit disabled state, and numeric animation.
`Hapus` remains text-labelled rather than icon-only so its destructive outcome
is explicit.

## Verification

Add a source-level regression test for the ordered action layout, run the POS
component tests and full frontend test suite, then run the production build.
