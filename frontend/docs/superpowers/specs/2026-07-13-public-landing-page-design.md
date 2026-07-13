# Balanja Public Landing Page Design

**Date:** 2026-07-13
**Status:** Approved

## Purpose

Create a public Bahasa Indonesia landing page for Balanja that targets Indonesian UMKM retail businesses. The page should closely follow the calm, spacious, product-led composition of the supplied Markd reference while remaining unmistakably part of the existing Balanja design system.

The page must present the real product. Product visuals will use screenshots captured from the current Balanja UI rather than invented dashboards, generic illustrations, fabricated metrics, or third-party product imagery.

## Route and Authentication Model

- `/` becomes the public landing page.
- `/login` becomes the Clerk sign-in entry point.
- Public navigation and primary calls to action lead to `/login` where appropriate.
- Existing authenticated routes remain unchanged: `/dashboard`, `/pos`, `/products`, `/stock`, `/transactions`, `/settings`, and `/design-system`.
- Authenticated users may still view the public landing page. The primary navigation can label the auth action contextually as `Buka dashboard` when reliable auth state is available; otherwise `Masuk` remains valid and Clerk handles the session.
- Unknown paths continue to fall back to the authenticated POS route only inside the authenticated application. Public routing must recognize `/` and `/login` explicitly.

## Audience and Positioning

The primary audience is Indonesian UMKM retail owners and cashiers, not only restaurants or F&B businesses. Copy should emphasize simple daily operations across sales, products, stock, and transaction history.

The landing page must avoid unsupported claims, fabricated testimonials, fake usage counts, or invented pricing. It should communicate product capabilities that already exist in the application.

## Page Architecture

The page follows the reference's editorial rhythm while using Balanja content and components:

1. Thin centered navigation
2. Spacious centered hero and two CTAs
3. Large framed screenshot of the Balanja POS
4. Feature introduction and product-detail grid
5. Operational workflow section with text and a real dashboard, stock, or transaction screenshot
6. Accessible FAQ accordion
7. Centered closing CTA
8. Compact footer

No pricing, contact form, newsletter, testimonial carousel, or new backend integration is included.

## Navigation

The header uses the existing Balanja logo and a quiet, bordered navigation container. It contains anchor links for `Fitur`, `Cara Kerja`, and `FAQ`, plus a high-priority `Masuk` action to `/login`.

On smaller screens, the header keeps the logo and auth action visible. Anchor links may collapse into a compact accessible menu when they cannot fit without crowding. The first viewport must keep the headline, supporting copy, primary CTA, and meaningful portion of the hero product visual readable.

## Hero Content

- Eyebrow: `POS untuk UMKM Indonesia`
- Headline: `Satu tempat untuk jualan, stok, dan transaksi.`
- Supporting copy: `Balanja membantu pemilik dan kasir mengelola penjualan harian tanpa alur yang rumit—cepat dipakai, mudah dipantau.`
- Primary CTA: `Mulai dengan Balanja`
- Secondary CTA: `Lihat fiturnya`

The headline should stay within two or three lines, use a large sans-serif display scale, and apply the existing subtle text color to its secondary phrase for the two-tone hierarchy seen in the reference. The hero remains calm and free of decorative statistics, fake badges, or technical microcopy.

## Product Visuals

All product visuals are captured from real Balanja screens using representative local/demo data already available in the product. The primary hero visual is the POS surface. Supporting visuals may use the dashboard, products catalog, stock movement, and transaction history pages.

Screenshots use fixed, implementation-friendly aspect ratios and consistent radii. The hero screenshot sits in one large landscape frame. Its supporting backdrop can reuse existing retail product photography from `public/images`, darkened and softened so the interface remains the focal point.

Supporting feature visuals should be purposefully framed views of the real UI. They must not falsify functionality. If a page is unavailable because authenticated data cannot be loaded in the local environment, use an existing verified local product screen rather than inventing a replacement.

## Feature Content

The feature introduction explains that Balanja keeps daily retail work in one focused surface. The feature set is limited to capabilities already present:

- Kasir cepat
- Katalog produk
- Stok tercatat
- Riwayat transaksi
- Dashboard penjualan
- Pemindaian barcode

The layout mirrors the reference's asymmetrical grid: one or two larger feature cards establish the section, followed by smaller supporting cards. Each card uses a real UI crop, concise title, and one short explanatory sentence. Cards use existing Balanja border, surface, radius, and shadow tokens.

## Operational Workflow Section

This section uses an editorial split layout: explanatory copy on one side and a large real application screenshot on the other. It shows that a completed sale updates an operational system rather than existing as an isolated transaction.

Suggested heading: `Penjualan, stok, dan riwayat tetap terhubung.`

Supporting points should describe the real workflow:

- Produk dan stok tersedia untuk alur kasir.
- Transaksi selesai tersimpan dalam riwayat.
- Dashboard merangkum performa penjualan.

The section must not claim cloud sync, offline support, accounting integration, or multi-location capabilities unless those capabilities are verified in the current product before implementation.

## FAQ

The FAQ uses an accessible accordion with native button semantics, visible focus states, and `aria-expanded`/panel relationships. Initial questions cover:

- Untuk jenis usaha apa Balanja dibuat?
- Apakah Balanja mendukung pemindaian barcode?
- Bagaimana produk dan stok dikelola?
- Apakah riwayat transaksi dapat dicari?
- Perangkat apa yang dapat digunakan?
- Bagaimana cara mulai menggunakan Balanja?

Answers must stay factual and match the implemented product. Unsupported details about data hosting, billing, device compatibility, multi-staff permissions, or offline behavior must be omitted or phrased conservatively.

## Closing CTA and Footer

The closing CTA returns to a centered, spacious composition.

- Heading: `Operasional toko, tanpa kerumitan.`
- Primary CTA: `Mulai dengan Balanja`
- Secondary CTA: `Lihat fitur`

The footer includes the Balanja logo, a one-sentence product description, anchor links, the login link, and a concise product-status line. It does not include fake legal links or social accounts.

## Visual System

The landing page reuses the established Balanja tokens:

- White and `app-bg` surfaces
- Near-black primary text and actions
- Muted and subtle text hierarchy
- Soft borders
- Existing 8px, 12px, and 16px radius hierarchy
- Light shadows only
- Existing system sans typography

The reference is expressed through spacing and composition rather than copying its serif typography or brand language. Marketing display headings may expand the current scale to approximately 64–72px on wide screens and 40–48px on mobile. Body copy remains readable and restrained.

Section spacing should be generous and consistent. Desktop content uses a centered maximum width and responsive gutters. Mobile sections stack in a single column without horizontal overflow. Containers remain flat and open; avoid cards inside cards and oversized rounded section wrappers.

## Motion and Interaction

- Anchor navigation may use smooth scrolling, with reduced-motion users receiving immediate navigation.
- Sections and product visuals may use a short fade/rise entrance based on existing duration and easing tokens.
- Hover movement is subtle and only enabled for fine pointers.
- The FAQ accordion uses a compact height/opacity transition that remains usable without animation.
- Image loading failures retain a stable framed fallback with clear alternative text.

No animation may block content or delay interaction.

## Design-System Synchronization

This feature introduces a marketing surface to a system previously focused on operational UI. Implementation must update both design-system sources in the same change:

1. Add a `Marketing page patterns` section to `/design-system` showing the display heading hierarchy, eyebrow, CTA pair, screenshot frame, section spacing, and FAQ row pattern.
2. Update `frontend/DESIGN.md` with the public marketing-page route, expanded display type scale, generous section spacing, screenshot framing rules, CTA hierarchy, responsive navigation behavior, and the boundary between marketing and compact operational layouts.

Existing operational pages remain compact. Marketing rules must not silently increase heading sizes or spacing across POS, catalog, dashboard, stock, or transaction screens.

## Component Boundaries

The landing page should be assembled from focused components with clear responsibilities:

- Public header and responsive navigation
- Hero content and CTA group
- Reusable product screenshot frame
- Feature grid and feature card
- Operational workflow section
- FAQ accordion and FAQ item
- Closing CTA
- Public footer

Shared Balanja primitives should be reused where their styling and semantics fit. Marketing-specific composition belongs in landing-page components rather than complicating operational primitives.

## Failure and Empty States

The page itself has no remote data dependency. Text and section structure render immediately. Screenshot assets include dimensions to prevent layout shift and meaningful alternative text. A failed screenshot displays a stable muted placeholder rather than collapsing the section.

Authentication failures remain Clerk's responsibility on `/login`. Landing-page actions must not appear to complete sign-in themselves.

## Accessibility

- Semantic landmarks and heading order
- Keyboard-operable navigation and FAQ
- Visible focus indicators using the existing focus token
- Descriptive link and button labels
- Sufficient contrast for subtle text at its rendered size
- Meaningful image alternatives
- Reduced-motion support
- No information communicated by color alone

## Verification

Implementation verification includes:

- `npm run test` from `frontend/`
- `npm run build` from `frontend/`
- Public `/` route renders without authentication
- `/login` renders Clerk sign-in and remains reachable from all primary CTAs
- Existing authenticated routes continue to resolve
- Anchor navigation and FAQ work with keyboard input
- Reduced-motion behavior is respected
- Desktop and mobile visual inspection confirms no text, navigation, CTA, screenshot, card, accordion, or footer overflow
- `/design-system` and `frontend/DESIGN.md` visibly document the new marketing patterns
- Captured product visuals correspond to real current Balanja screens

