# Product

## Register

product

## Users

Cashiers and shop owners at Indonesian UMKM (micro, small, and medium) shops. They work at a physical counter, often on a phone in one hand, in fast repeat cycles: scan or search a product, adjust quantity, take cash or QRIS payment, finish the transaction. They are not technical; many sessions are long and repetitive, so speed and memorability beat discoverability of rarely-used features. Indonesian language throughout.

## Product Purpose

Balanja is a retail point-of-sale application for Indonesian UMKM shops. It replaces paper notes and calculator-based sales with a fast, reliable way to record transactions, track stock, and see simple daily revenue. Success looks like a cashier completing a sale in seconds without hesitation, and a shop owner trusting the numbers at the end of the day.

## Brand Personality

Simple, dense, quiet, fast. The product should feel like a well-made tool that disappears into the task: white surfaces, soft borders, compact controls, near-black primary actions, restrained motion that conveys state rather than decoration. Confidence through precision, not through noise.

## Anti-references

- Hero-style marketing layouts inside operational screens (no decorative hero sections, gradients, or one-off shadows in the product UI)
- Nested cards: one primary bordered surface with flat rows, never a card inside a card
- Divider-line chrome: no standalone top/bottom dividers on headers, toolbars, or list rows (a complete border may define an input, card, table, drawer, popover, or dialog)
- Barely-visible gray text for hierarchy; text carrying meaning must meet 4.5:1 contrast
- Invented affordances for standard tasks: native patterns (modals, drawers, popovers, tables) used properly
- Heavy color or full-saturation accents on inactive states; accent is reserved for primary actions and current selection

## Design Principles

1. **Cashier speed over feature breadth.** The primary transaction loop must be completable in seconds with minimal taps; every added control must justify its space against that loop.
2. **Quiet by default, loud at commit.** Restrained surfaces and controls until the single forward action (checkout, save, apply), which uses the solid near-black primary treatment.
3. **Progressive disclosure.** Full payment details, filter options, and settings appear only when the user acts; collapse states stay mounted but inert.
4. **Physical, continuous motion.** Drawers, the cart, and the cash-feedback status feel like one continuous physical surface — springs and opacity handoffs, never pop-in choreography; reduced-motion contexts keep only short opacity handoffs.
5. **Practice what you document.** Every screen follows the shared contract: 44px touch targets, smartphone-first shell at every width, tokenized radii/shadows/borders, one consistent component vocabulary.

## Accessibility & Inclusion

WCAG AA is the working bar: at least 4.5:1 contrast for text, visible 2px focus outlines, 44px touch targets on compact surfaces, 16px text on coarse-touch inputs to prevent focus zoom. Reduced motion is first-class: every motion has a `prefers-reduced-motion` alternative (short opacity handoff, no translation/scale/height animation). Screen-reader flow matters: semantic landmarks, aria-live regions for cart changes and cash feedback, focus trapping and return in drawers and dialogs, Escape-to-close everywhere. Do not disable pinch zoom.
