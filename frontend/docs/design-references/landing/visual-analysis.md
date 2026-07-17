# Balanja Landing Visual Analysis

## Shared System

- Palette: white and `#fafafa` dominate; primary text is the existing near-black `#242424`; secondary copy stays in the current muted gray range; borders use the existing soft `#ececec`; the only semantic accent visible in product imagery is the current restrained success green.
- Type hierarchy: Manrope-like sans throughout. Desktop marketing display text sits between 64px and 72px with 0.98–1.02 line height; section headings sit between 44px and 56px; body copy stays at 16px to 18px with relaxed 1.55–1.7 line height; eyebrow and navigation text stay at 12px to 14px.
- Desktop gutter and max width: 48px to 64px outer gutter at 1440px; primary content is constrained to roughly 1120px to 1240px; FAQ content narrows to approximately 680px to 760px.
- Radius and border logic: 8px buttons, 12px feature frames, and 16px hero/product frames. Borders remain 1px and low contrast. Shadows are broad and faint, reserved for the primary product frame rather than every section.
- CTA hierarchy: primary action is near-black with white text, 44px to 48px tall, 16px to 24px horizontal padding; secondary action is a white bordered control at the same height. Both are rounded controls rather than oversized pills.
- Motion cues: short staggered rise-and-fade for hero copy, CTAs, product frame, and feature cards; no parallax, marquee, glow, or continuously moving decoration.

## Hero

- Composition: a thin full-width header with a centered link cluster and right-aligned auth action, followed by a calm centered hero. The headline is the sole dominant element; eyebrow, copy, and CTAs support it without competing.
- Headline wrapping: two lines at wide desktop. The first phrase remains near-black and the second phrase introduces muted text before returning to near-black, reproducing the reference's two-tone hierarchy without gradient text.
- Screenshot frame: one large 16:10 landscape product frame, approximately 1120px wide, aligned directly under the CTA group. The frame uses a quiet border, 16px radius, and subtle elevation. Production content must be a real current Balanja POS screenshot rather than the generated UI.
- Vertical rhythm: approximately 64px from header to eyebrow, 20px eyebrow-to-heading, 24px heading-to-copy, 28px copy-to-CTA, and 48px CTA-to-product frame. The product frame may extend below the initial 900px viewport, matching the supplied page's product-led reveal.

## Features

- Grid: an asymmetric composition with introductory copy occupying the upper-left and one wide primary feature occupying the upper-right. Supporting features form varied lower modules rather than three identical columns. The implementation should translate this into a 12-column desktop grid and a single mobile column.
- Card hierarchy: the primary Kasir cepat feature is about twice the visual area of supporting modules. Supporting titles and descriptions stay outside or directly above their screenshot frames so cards do not become nested containers.
- Image treatment: real Balanja product screenshots fill soft bordered frames. Crops focus on the workflow being described while retaining enough navigation and surrounding UI to remain credible.

## Workflow

- Column ratio: approximately 42/58 at desktop, with copy left and one large screenshot right. Content aligns vertically around the screenshot center rather than forcing equal-height boxes.
- Copy rhythm: small eyebrow, three-line heading, two to three lines of body copy, then exactly three short check points with generous 24px to 32px separation.
- Screenshot treatment: one open 16:10 product frame with 16px radius and low-contrast border. The generated multi-outlet and real-time claims are visual-reference hallucinations and must not appear in production copy.

## FAQ

- Column width: approximately 700px centered inside a much wider page, leaving strong negative space on both sides.
- Row height and divider logic: 68px to 76px closed rows separated by 1px borders, no outer card. The open row expands naturally for two to three answer lines. Plus/minus controls stay visually small while the entire row remains the button target.
- Content constraint: generated questions about offline use, pricing, multi-outlet support, and data security are not verified product claims. Production questions use only the approved, current feature set.

## Closing CTA and Footer

- CTA spacing: the closing block uses at least 144px vertical space above and below. The heading is approximately 56px to 64px on desktop, constrained to two lines, with 24px to copy and 28px to the CTA group.
- Footer alignment: subtle top and bottom dividers, brand and description on the left, two compact link columns on the right, and a low-emphasis status row below. It remains open whitespace rather than a boxed dark footer.

## Responsive Translation

- Tablet: preserve 32px gutters; reduce the hero to 52px to 56px; allow the feature introduction and primary feature to stack before a two-column supporting grid; stack workflow copy above its screenshot when its columns become cramped.
- Mobile: use 16px gutters and 80px section spacing; reduce the hero to 42px with a maximum of three lines; keep logo and auth CTA visible while hiding secondary anchor links; stack all CTAs when 360px width cannot hold them; render every feature in one column; preserve 16:10 screenshot frames; keep FAQ button targets at least 44px high; stack footer brand and link groups without horizontal overflow.
