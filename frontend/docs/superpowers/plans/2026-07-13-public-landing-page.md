# Balanja Public Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public Bahasa Indonesia landing page at `/`, move Clerk sign-in to `/login`, showcase real Balanja UI screenshots, and document the new marketing patterns without changing the density of authenticated operational screens.

**Architecture:** Keep public marketing composition separate from authenticated POS composition. A small pure routing module decides valid public and private paths, focused landing components render static product content, and real local application screenshots are stored as versioned assets behind one reusable screenshot-frame component. Marketing-only typography and spacing are documented in both `/design-system` and `DESIGN.md`.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 4, Clerk React, Node test runner, existing Balanja primitives and semantic design tokens.

---

## File Map

### Create

- `frontend/src/routing.js` — pure route normalization and public/private route classification.
- `frontend/src/routing.test.js` — route behavior tests without JSX or browser dependencies.
- `frontend/src/pages/LandingPage.jsx` — public page composition only.
- `frontend/src/pages/LandingPage.test.js` — source/content contract tests for the public page.
- `frontend/src/landing/content.js` — Bahasa Indonesia navigation, feature, workflow, and FAQ copy.
- `frontend/src/landing/ProductScreenshot.jsx` — stable screenshot frame with load-error fallback.
- `frontend/src/landing/FaqSection.jsx` — accessible one-open-item FAQ accordion.
- `frontend/src/components/design/MarketingPatternsShowcase.jsx` — design-system examples for marketing typography, CTA groups, screenshot frames, and FAQ rows.
- `frontend/public/images/landing/pos-overview.png` — real POS screenshot.
- `frontend/public/images/landing/dashboard-overview.png` — real dashboard screenshot.
- `frontend/public/images/landing/products-overview.png` — real products screenshot.
- `frontend/public/images/landing/stock-overview.png` — real stock screenshot.
- `frontend/public/images/landing/transactions-overview.png` — real transactions screenshot.
- `frontend/docs/design-references/landing/visual-analysis.md` — extracted section-by-section visual decisions from generated references.

### Modify

- `frontend/src/shared.jsx` — add the public landing route and move login to `/login`.
- `frontend/src/App.jsx` — render public routes outside the authenticated shell and redirect signed-out private routes to `/login`.
- `frontend/src/pages/LoginPage.jsx` — replace the unused demo login form with the real Clerk sign-in surface.
- `frontend/src/pages/DesignSystemPage.jsx` — add the marketing-pattern showcase.
- `frontend/src/components/design/TypographyPanel.jsx` — expose the marketing display scale alongside operational scales.
- `frontend/src/index.css` — add marketing reveal and reduced-motion rules while preserving existing tokens.
- `frontend/index.html` — set Indonesian document language, landing-page title, and product description.
- `frontend/DESIGN.md` — document public marketing patterns and their boundary from operational UI.

## Task 1: Generate and Analyze Section References

**Files:**
- Create: `frontend/docs/design-references/landing/visual-analysis.md`

- [ ] **Step 1: Generate fresh standalone section references**

Use the image-generation tool once for each of these six standalone desktop sections. Do not crop the supplied Markd screenshot and do not combine the sections into a compressed board.

```text
1. Hero: Balanja Indonesian retail POS landing page, pristine light mode, thin centered navbar, spacious two-tone sans headline, two CTAs, one large landscape POS screenshot frame, existing Balanja white/near-black/soft-gray design language, 1440px desktop composition.

2. Features: Balanja retail operations feature section, editorial heading, one large and four smaller real-product screenshot cards, calm white surface, soft borders, 12px radii, generous whitespace, no fake metrics.

3. Workflow: Balanja operational workflow section, Indonesian copy on the left, large dashboard/stock screenshot on the right, open editorial split composition, three concise check points, no nested card shell.

4. FAQ: Balanja FAQ section, narrow centered column, six quiet divider rows, accessible accordion visual state, generous vertical whitespace, near-black and muted gray palette.

5. Closing CTA: Balanja centered closing CTA, two-line Indonesian headline, one primary dark CTA and one secondary bordered CTA, very spacious white composition.

6. Footer: compact Balanja public footer, logo and one-sentence description on left, two small link columns on right, subtle top divider and product status line.
```

Expected: six readable, section-specific references that share the Balanja palette, Manrope-like sans typography, 8/12/16px radius logic, and the supplied reference's spacious cadence.

- [ ] **Step 2: Inspect every reference at original detail**

Use the local image viewer on each generated image. Record the visible hierarchy, approximate type scale, horizontal gutters, section spacing, CTA dimensions, screenshot aspect ratio, border/radius treatment, and any unclear detail.

Expected: all text, CTAs, and screenshot frames are large enough to analyze. Regenerate any unclear section as a fresh standalone image.

- [ ] **Step 3: Write the extraction notes**

Create `frontend/docs/design-references/landing/visual-analysis.md` with this exact structure and fill every bullet with observed values:

```markdown
# Balanja Landing Visual Analysis

## Shared System
- Palette:
- Type hierarchy:
- Desktop gutter and max width:
- Radius and border logic:
- CTA hierarchy:
- Motion cues:

## Hero
- Composition:
- Headline wrapping:
- Screenshot frame:
- Vertical rhythm:

## Features
- Grid:
- Card hierarchy:
- Image treatment:

## Workflow
- Column ratio:
- Copy rhythm:
- Screenshot treatment:

## FAQ
- Column width:
- Row height and divider logic:

## Closing CTA and Footer
- CTA spacing:
- Footer alignment:

## Responsive Translation
- Tablet:
- Mobile:
```

- [ ] **Step 4: Self-check the analysis**

Run:

```bash
rg -n "^-[^:]+:$|T[B]D|T[O]DO|unfinished" frontend/docs/design-references/landing/visual-analysis.md
```

Expected: no output.

- [ ] **Step 5: Commit the visual direction**

```bash
git add frontend/docs/design-references/landing
git commit -m "docs: define landing page visual direction"
```

## Task 2: Add Public and Private Route Semantics

**Files:**
- Create: `frontend/src/routing.js`
- Create: `frontend/src/routing.test.js`
- Modify: `frontend/src/shared.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Write the failing pure routing tests**

Create `frontend/src/routing.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizePath, routeAccess } from "./routing.js";

test("public landing and login routes stay public", () => {
  assert.equal(routeAccess("/"), "public");
  assert.equal(routeAccess("/login"), "public");
  assert.equal(normalizePath("/", false), "/");
  assert.equal(normalizePath("/login", false), "/login");
});

test("signed-out users are sent from private routes to login", () => {
  assert.equal(routeAccess("/pos"), "private");
  assert.equal(normalizePath("/pos", false, false), "/pos");
  assert.equal(normalizePath("/pos", false), "/login");
  assert.equal(normalizePath("/dashboard", false), "/login");
});

test("signed-in users retain private routes", () => {
  assert.equal(normalizePath("/pos", true), "/pos");
  assert.equal(normalizePath("/design-system", true), "/design-system");
});

test("unknown paths fall back by authentication state", () => {
  assert.equal(normalizePath("/missing", false), "/");
  assert.equal(normalizePath("/missing", true), "/pos");
});
```

- [ ] **Step 2: Run the routing test to verify it fails**

Run:

```bash
cd frontend && node --test src/routing.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `routing.js`.

- [ ] **Step 3: Implement route classification**

Create `frontend/src/routing.js`:

```js
const PUBLIC_PATHS = new Set(["/", "/login"]);
const PRIVATE_PATHS = new Set([
  "/dashboard",
  "/pos",
  "/products",
  "/stock",
  "/transactions",
  "/settings",
  "/design-system",
]);

export function routeAccess(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return "public";
  if (PRIVATE_PATHS.has(pathname)) return "private";
  return "unknown";
}

export function normalizePath(pathname, isSignedIn, isAuthLoaded = true) {
  const access = routeAccess(pathname);
  if (access === "public") return pathname;
  if (access === "private" && !isAuthLoaded) return pathname;
  if (access === "private") return isSignedIn ? pathname : "/login";
  return isSignedIn ? "/pos" : "/";
}
```

Update the route constants in `frontend/src/shared.jsx`:

```js
export const routes = {
  landing: "/",
  login: "/login",
  dashboard: "/dashboard",
  pos: "/pos",
  products: "/products",
  stock: "/stock",
  transactions: "/transactions",
  settings: "/settings",
  designSystem: "/design-system",
};
```

- [ ] **Step 4: Refactor `App.jsx` around the public/private boundary**

Import `useAuth`, `LandingPage`, `LoginPage`, and `normalizePath`. Update `usePathname` to accept `isSignedIn`, re-normalize when auth changes, and preserve popstate behavior. Render public routes before the signed-in shell:

```jsx
export default function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const [pathname, navigate] = usePathname(Boolean(isSignedIn), isLoaded);

  if (pathname === routes.landing) {
    return <LandingPage isSignedIn={Boolean(isSignedIn)} onNavigate={navigate} />;
  }

  if (pathname === routes.login) {
    return <LoginPage isSignedIn={Boolean(isSignedIn)} onNavigate={navigate} />;
  }

  if (!isLoaded) {
    return <div className="min-h-screen bg-app-bg" aria-busy="true" />;
  }

  return (
    <div className="min-h-screen bg-app-bg text-text antialiased">
      <Toaster
        position="bottom-right"
        closeButton
        richColors
        visibleToasts={3}
        duration={2800}
        offset={24}
      />
      <Show when="signed-in">
        {pathname === routes.designSystem ? (
          <DesignSystemPage onNavigate={navigate} />
        ) : (
          <AppShell pathname={pathname} onNavigate={navigate}>
            <AppPage pathname={pathname} onNavigate={navigate} />
          </AppShell>
        )}
      </Show>
    </div>
  );
}
```

`usePathname` must call `normalizePath(window.location.pathname, isSignedIn, isAuthLoaded)` in its initializer, popstate handler, navigation callback, and an effect that reacts to both auth values. When the auth effect changes a private path to `/login`, use `window.history.replaceState` before updating state so Back does not loop through a protected URL. Public `/` must render while Clerk is still loading.

- [ ] **Step 5: Run routing and existing tests**

Run:

```bash
cd frontend && npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit route changes**

```bash
git add frontend/src/routing.js frontend/src/routing.test.js frontend/src/shared.jsx frontend/src/App.jsx
git commit -m "feat: separate public and private routes"
```

## Task 3: Move Clerk Sign-In to `/login`

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`
- Create: `frontend/src/pages/LoginPage.test.js`

- [ ] **Step 1: Write the failing login-page contract test**

Create `frontend/src/pages/LoginPage.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("login page uses Clerk and links back to the public landing page", async () => {
  const source = await readFile(new URL("./LoginPage.jsx", import.meta.url), "utf8");

  assert.match(source, /<SignIn/);
  assert.match(source, /routing="hash"/);
  assert.match(source, /afterSignInUrl=\{routes\.dashboard\}/);
  assert.match(source, /onNavigate\(routes\.landing\)/);
  assert.doesNotMatch(source, /Staff PIN/);
  assert.doesNotMatch(source, /BALANJA-01/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd frontend && node --test src/pages/LoginPage.test.js
```

Expected: FAIL because the current file contains the demo staff form and does not render Clerk.

- [ ] **Step 3: Replace the demo login with Clerk**

Implement `frontend/src/pages/LoginPage.jsx` as a focused auth surface:

```jsx
import React from "react";
import { SignIn } from "@clerk/react";
import { Button } from "../components/primitives.jsx";
import { Logo, routes } from "../shared.jsx";

export default function LoginPage({ isSignedIn, onNavigate }) {
  return (
    <main className="min-h-screen bg-app-bg px-4 py-6 text-text sm:px-6">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <button type="button" onClick={() => onNavigate(routes.landing)} aria-label="Kembali ke beranda">
          <Logo />
        </button>
        <Button type="button" variant="ghost" onClick={() => onNavigate(routes.landing)}>
          Kembali
        </Button>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl place-items-center py-10">
        {isSignedIn ? (
          <div className="grid max-w-md justify-items-center gap-4 text-center">
            <h1 className="text-3xl font-semibold">Anda sudah masuk.</h1>
            <p className="text-sm leading-6 text-text-muted">Buka dashboard untuk melanjutkan operasional toko.</p>
            <Button type="button" variant="primary" size="lg" onClick={() => onNavigate(routes.dashboard)}>
              Buka dashboard
            </Button>
          </div>
        ) : (
          <div className="rounded-panel border border-border bg-surface p-4 shadow-panel">
            <SignIn routing="hash" afterSignInUrl={routes.dashboard} />
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run the focused and full tests**

Run:

```bash
cd frontend && node --test src/pages/LoginPage.test.js && npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the login route**

```bash
git add frontend/src/pages/LoginPage.jsx frontend/src/pages/LoginPage.test.js
git commit -m "feat: move Clerk sign in to login route"
```

## Task 4: Capture Real Balanja Product Screenshots

**Files:**
- Create: `frontend/public/images/landing/pos-overview.png`
- Create: `frontend/public/images/landing/dashboard-overview.png`
- Create: `frontend/public/images/landing/products-overview.png`
- Create: `frontend/public/images/landing/stock-overview.png`
- Create: `frontend/public/images/landing/transactions-overview.png`

- [ ] **Step 1: Start the backend and frontend using the existing local configuration**

Run the backend in one terminal:

```bash
cd backend && go run ./cmd/api
```

Expected: API server starts without migration or configuration errors.

Run the frontend in another terminal:

```bash
cd frontend && npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL and the app loads.

- [ ] **Step 2: Open the app in an authenticated browser session**

Use the in-app browser or connected Chrome session. Sign in only through the configured Clerk flow. Do not add bypass code, seeded fake screens, or authentication shortcuts.

Expected: `/pos`, `/dashboard`, `/products`, `/stock`, and `/transactions` render current Balanja UI.

- [ ] **Step 3: Prepare representative real UI states**

For each page, use existing local/demo records and non-destructive UI controls:

```text
/pos           — product grid visible, two representative cart items, no modal open
/dashboard     — KPI row and primary chart visible
/products      — default product table with search field empty
/stock         — stock movement table with default filters
/transactions  — transaction table with default filters
```

Do not create a sale or mutate stock solely for marketing screenshots unless the user explicitly authorizes those external data changes.

- [ ] **Step 4: Capture consistent screenshots**

Use a 1440×900 viewport at device scale 1. Capture only the application viewport, not browser chrome. Save lossless PNG files to the five exact paths listed above. Keep the current Balanja logo, navigation, populated content, and real labels visible. Redact no data by painting over the UI; instead choose records that contain no sensitive personal information.

- [ ] **Step 5: Verify dimensions and visual integrity**

Run:

```bash
file frontend/public/images/landing/*.png
```

Expected: five PNG files, each reporting 1440 × 900.

Inspect every image at original detail. Expected: no browser chrome, loading skeleton, open menu, toast, modal, clipped table, personal information, or broken image.

- [ ] **Step 6: Commit only verified screenshots**

```bash
git add frontend/public/images/landing
git commit -m "assets: add real Balanja product screenshots"
```

## Task 5: Build Landing Content and Focused Components

**Files:**
- Create: `frontend/src/landing/content.js`
- Create: `frontend/src/landing/ProductScreenshot.jsx`
- Create: `frontend/src/landing/FaqSection.jsx`
- Create: `frontend/src/pages/LandingPage.jsx`
- Create: `frontend/src/pages/LandingPage.test.js`

- [ ] **Step 1: Write the failing landing-page contract test**

Create `frontend/src/pages/LandingPage.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { features, faqs } from "../landing/content.js";

test("landing content covers verified retail workflows", () => {
  assert.equal(features.length, 6);
  assert.deepEqual(
    features.map((feature) => feature.title),
    ["Kasir cepat", "Katalog produk", "Stok tercatat", "Riwayat transaksi", "Dashboard penjualan", "Pemindaian barcode"],
  );
  assert.equal(faqs.length, 6);
});

test("landing page keeps the approved hero and public calls to action", async () => {
  const source = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");

  assert.match(source, /Satu tempat untuk jualan/);
  assert.match(source, /stok, dan transaksi/);
  assert.match(source, /Mulai dengan Balanja/);
  assert.match(source, /routes\.login/);
  assert.match(source, /id="fitur"/);
  assert.match(source, /id="cara-kerja"/);
  assert.match(source, /id="faq"/);
});

test("landing page uses versioned real product screenshots", async () => {
  const content = await readFile(new URL("../landing/content.js", import.meta.url), "utf8");
  assert.match(content, /\/images\/landing\/pos-overview\.png/);
  assert.match(content, /\/images\/landing\/dashboard-overview\.png/);
  assert.doesNotMatch(content, /unsplash|placehold|lorem/i);
});
```

- [ ] **Step 2: Run the landing test to verify it fails**

Run:

```bash
cd frontend && node --test src/pages/LandingPage.test.js
```

Expected: FAIL with missing `landing/content.js`.

- [ ] **Step 3: Add approved static content**

Create `frontend/src/landing/content.js` with exported `navItems`, `features`, `workflowPoints`, and `faqs`. Use exactly six features and six FAQ items. Each feature object has `title`, `description`, `image`, `alt`, and `size` (`wide` or `standard`). Each FAQ object has `question` and a factual `answer`. Use these screenshot paths:

```js
export const screenshots = {
  pos: "/images/landing/pos-overview.png",
  dashboard: "/images/landing/dashboard-overview.png",
  products: "/images/landing/products-overview.png",
  stock: "/images/landing/stock-overview.png",
  transactions: "/images/landing/transactions-overview.png",
};
```

FAQ answers must only claim current capabilities: browser-based use, barcode scanning, product/stock management, searchable transaction history, and Clerk-based access. Do not claim offline mode, accounting integration, multi-location support, or pricing.

- [ ] **Step 4: Implement the screenshot frame**

Create `frontend/src/landing/ProductScreenshot.jsx`:

```jsx
import React from "react";

export default function ProductScreenshot({ src, alt, className = "", eager = false }) {
  const [failed, setFailed] = React.useState(false);

  return (
    <div className={`relative overflow-hidden rounded-panel border border-border bg-surface-muted shadow-panel ${className}`}>
      {failed ? (
        <div role="img" aria-label={alt} className="grid h-full min-h-48 place-items-center px-6 text-center text-sm text-text-muted">
          Tampilan produk sedang tidak tersedia.
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width="1440"
          height="900"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement the accessible FAQ**

Create `frontend/src/landing/FaqSection.jsx`. Store the open index in state, render every question as a full-width `button`, connect button and panel using `aria-controls`, `aria-expanded`, `id`, and `aria-labelledby`, and use the existing `Icon` with `plus`/`minus`. Keep answers mounted only while open so hidden content is not focusable.

The button class must include:

```text
flex w-full items-center justify-between gap-6 py-5 text-left text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus
```

- [ ] **Step 6: Compose `LandingPage.jsx`**

Build the approved sections in this exact order:

```jsx
<PublicHeader />
<main>
  <Hero />
  <ProductHero />
  <FeatureSection id="fitur" />
  <WorkflowSection id="cara-kerja" />
  <FaqSection id="faq" />
  <ClosingCta />
</main>
<PublicFooter />
```

Use a centered `max-w-6xl` content width, `px-4 sm:px-6`, and section spacing near `py-20 sm:py-28 lg:py-36`. Keep the hero heading within `max-w-4xl`, `text-[42px] sm:text-[56px] lg:text-[72px]`, and `leading-[0.98]`. Split the second phrase into `text-text-subtle`. Primary actions call `onNavigate(routes.login)` or `onNavigate(routes.dashboard)` when `isSignedIn`; anchor actions use native `href="#fitur"`.

The feature grid uses one wide two-column card and four standard cards without nested outer panels. The workflow uses `lg:grid-cols-[0.9fr_1.1fr]`. The mobile header keeps logo and auth action visible and hides only the anchor cluster below `md`.

- [ ] **Step 7: Run focused tests**

Run:

```bash
cd frontend && node --test src/pages/LandingPage.test.js src/routing.test.js src/pages/LoginPage.test.js
```

Expected: all focused tests PASS.

- [ ] **Step 8: Commit the public landing page**

```bash
git add frontend/src/landing frontend/src/pages/LandingPage.jsx frontend/src/pages/LandingPage.test.js
git commit -m "feat: add Balanja public landing page"
```

## Task 6: Add Marketing Motion and Document Metadata

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/index.html`

- [ ] **Step 1: Write a failing source contract test**

Append to `frontend/src/pages/LandingPage.test.js`:

```js
test("marketing motion has an explicit reduced-motion fallback", async () => {
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  assert.match(css, /\.marketing-reveal/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd frontend && node --test src/pages/LandingPage.test.js
```

Expected: FAIL because `.marketing-reveal` is absent.

- [ ] **Step 3: Add restrained marketing motion**

Add to `frontend/src/index.css`:

```css
@layer components {
  .marketing-reveal {
    animation: marketing-reveal 560ms var(--ease-standard) both;
    animation-delay: var(--reveal-delay, 0ms);
    will-change: transform, opacity;
  }
}

@keyframes marketing-reveal {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  html:focus-within {
    scroll-behavior: auto;
  }

  .marketing-reveal {
    animation: none;
  }
}
```

Apply `scroll-smooth motion-reduce:scroll-auto` on the public page root or use equivalent CSS. Do not add scroll-jacking, parallax, or continuously looping decoration.

- [ ] **Step 4: Update public document metadata**

Change `frontend/index.html` to:

```html
<html lang="id">
```

Use:

```html
<title>Balanja — POS sederhana untuk UMKM retail</title>
<meta name="description" content="Kelola penjualan, produk, stok, dan riwayat transaksi UMKM retail dalam satu POS yang sederhana." />
```

- [ ] **Step 5: Run the focused test and build**

Run:

```bash
cd frontend && node --test src/pages/LandingPage.test.js && npm run build
```

Expected: test PASS and Vite build exits 0.

- [ ] **Step 6: Commit motion and metadata**

```bash
git add frontend/src/index.css frontend/index.html frontend/src/pages/LandingPage.test.js
git commit -m "feat: polish landing motion and metadata"
```

## Task 7: Synchronize `/design-system` and `DESIGN.md`

**Files:**
- Create: `frontend/src/components/design/MarketingPatternsShowcase.jsx`
- Create: `frontend/src/components/design/MarketingPatternsShowcase.test.js`
- Modify: `frontend/src/components/design/TypographyPanel.jsx`
- Modify: `frontend/src/pages/DesignSystemPage.jsx`
- Modify: `frontend/DESIGN.md`

- [ ] **Step 1: Write the failing design-system synchronization test**

Create `frontend/src/components/design/MarketingPatternsShowcase.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system exposes the landing-page marketing patterns", async () => {
  const page = await readFile(new URL("../../pages/DesignSystemPage.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");

  assert.match(page, /MarketingPatternsShowcase/);
  assert.match(design, /Public Marketing Pages/);
  assert.match(design, /64px to 72px/);
  assert.match(design, /Marketing rules do not apply to operational screens/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd frontend && node --test src/components/design/MarketingPatternsShowcase.test.js
```

Expected: FAIL because neither showcase nor documentation exists.

- [ ] **Step 3: Add the visual marketing showcase**

Create `MarketingPatternsShowcase.jsx` with one open section containing:

```text
Eyebrow + 64px/72px display heading sample
Primary + secondary CTA group using Button
16:10 ProductScreenshot sample
One closed and one open FAQ row sample
Section-spacing annotation: 80 / 112 / 144px
Boundary note: marketing scale is public-page only
```

Import and render it immediately after `TypographyPanel` in `DesignSystemPage.jsx`. Add a `Marketing display` row to `TypographyPanel.jsx` using `text-[42px] sm:text-[56px] lg:text-[72px] leading-[0.98]` and note `Manrope 700 / 42–72px`.

- [ ] **Step 4: Update `DESIGN.md`**

Add a `## Public Marketing Pages` section with these enforceable rules:

```markdown
## Public Marketing Pages

The public landing page lives at `/`; Clerk sign-in lives at `/login`. Public pages may use the spacious editorial composition documented by the Marketing page patterns showcase. Marketing rules do not apply to operational screens.

Marketing display headings use 40px to 48px on mobile and 64px to 72px on wide screens, with a tight 0.98 to 1.04 line height. Keep hero headlines to two or three lines. Major section spacing scales from 80px on mobile to 112px on tablet and 144px on wide screens.

Use the existing semantic palette, 8px/12px/16px radius hierarchy, soft borders, near-black primary CTA, and bordered secondary CTA. Product screenshots must show real current Balanja UI, use stable 16:10 frames, include intrinsic dimensions and descriptive alt text, and provide a muted failure fallback.

Public navigation keeps the logo and authentication action visible on mobile; secondary anchor links may collapse or hide below the medium breakpoint. Marketing compositions stay open and flat—do not introduce nested cards or apply enlarged typography and spacing to POS, dashboard, catalog, stock, transactions, settings, or dialogs.
```

- [ ] **Step 5: Run design-system and full tests**

Run:

```bash
cd frontend && node --test src/components/design/MarketingPatternsShowcase.test.js && npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit synchronized design-system changes**

```bash
git add frontend/src/components/design/MarketingPatternsShowcase.jsx frontend/src/components/design/MarketingPatternsShowcase.test.js frontend/src/components/design/TypographyPanel.jsx frontend/src/pages/DesignSystemPage.jsx frontend/DESIGN.md
git commit -m "docs: add public marketing design patterns"
```

## Task 8: Full Verification and Visual QA

**Files:**
- Modify only if verification reveals a landing-page defect.

- [ ] **Step 1: Run the complete automated test suite**

Run:

```bash
cd frontend && npm test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run:

```bash
cd frontend && npm run build
```

Expected: Vite build exits 0 and emits `frontend/dist` assets without unresolved imports.

- [ ] **Step 3: Verify public and authentication routes**

In a signed-out browser session, verify:

```text
/                 landing page renders without Clerk overlay
/login            Clerk sign-in renders
/pos              redirects to /login
/missing          normalizes to /
```

In a signed-in browser session, verify:

```text
/                 landing page remains viewable; auth CTA opens dashboard
/login            shows the already-signed-in state and dashboard CTA
/dashboard        authenticated shell renders
/design-system    marketing pattern showcase renders
```

- [ ] **Step 4: Verify desktop visual fidelity**

At 1440×900, compare the implementation to the generated section references and supplied Markd screenshot. Verify the thin navbar, restrained hero, two-tone headline, large product screenshot, varied feature grid, editorial workflow split, narrow FAQ, spacious CTA, and compact footer. Confirm all product screenshots are real Balanja screens.

- [ ] **Step 5: Verify responsive layouts**

Inspect at 1024×768, 768×1024, 390×844, and 360×800. Confirm:

```text
No horizontal scroll
Logo and auth CTA remain visible
Headline stays within three lines where practical
Primary CTA remains obvious
Screenshot frames preserve aspect ratio
Feature cards become one column
FAQ buttons remain at least 44px tall
Footer links remain readable
```

- [ ] **Step 6: Verify keyboard and reduced-motion behavior**

Navigate header, CTAs, and FAQ using Tab, Shift+Tab, Enter, and Space. Confirm visible focus, correct FAQ expansion state, and logical focus order. Emulate `prefers-reduced-motion: reduce`; confirm reveal transforms and smooth scrolling are disabled.

- [ ] **Step 7: Check the final diff and repository status**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. `backend/.env` remains untracked and untouched. Only intentional landing-page changes remain.

- [ ] **Step 8: Commit any verification-only fixes**

If verification required code changes, stage only the affected landing-page/design-system files and commit:

```bash
git commit -m "fix: refine landing page responsiveness"
```

If no fixes were needed, do not create an empty commit.
