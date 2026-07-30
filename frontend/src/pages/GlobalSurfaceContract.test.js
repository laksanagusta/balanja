import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dividerPattern = /\b(?:border-t|border-b|divide-y)\b/;

test("global page canvas is white in tokens and design guidance", async () => {
  const [styles, tokens, design] = await Promise.all([
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("../data.js", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /--color-app-bg:\s*#ffffff;/);
  assert.match(tokens, /\["Background", "--color-app-bg", "#ffffff"\]/);
  assert.match(design, /global `app-bg` canvas is pure white and matches `surface`/);
  assert.match(design, /do not use standalone top or bottom divider lines/);
});

test("page chrome and shared flat collections do not use structural dividers", async () => {
  const files = [
    "../components/AppShell.jsx",
    "../components/TablePagination.jsx",
    "../components/primitives.jsx",
    "../components/dashboard/DashboardCharts.jsx",
    "../components/dashboard/LowStockPanel.jsx",
    "../components/settings/MasterDataManager.jsx",
    "./LandingPage.jsx",
    "./ProductsPage.jsx",
    "./RetailPosPage.jsx",
    "./SalesReportPage.jsx",
    "./SettingsPage.jsx",
    "./StockPage.jsx",
    "./TransactionsPage.jsx",
  ];

  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, dividerPattern, `${file} contains a structural divider`);
  }
});

test("rounded rectangles use cross-browser border radius without corner smoothing", async () => {
  const [styles, tokens, design] = await Promise.all([
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("../data.js", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /--radius-control:\s*8px;/);
  assert.match(styles, /--radius-card:\s*16px;/);
  assert.match(styles, /--radius-panel:\s*16px;/);
  assert.match(styles, /--radius-overlay:\s*32px;/);
  assert.doesNotMatch(styles, /corner-shape|corner-smoothing|corner-superellipse/);
  assert.match(styles, /\.overlay-sticky-header\s*\{\s*position:\s*sticky;\s*inset-block-start:\s*0;/);
  assert.match(tokens, /\["XS - Controls", "--radius-control", "8px"\]/);
  assert.match(tokens, /\["S - Cards & Inputs", "--radius-card", "16px"\]/);
  assert.match(tokens, /\["M - Panels", "--radius-panel", "16px"\]/);
  assert.match(tokens, /\["L - Modals & Drawers", "--radius-overlay", "32px"\]/);
  assert.doesNotMatch(tokens, /corner-smoothing|corner-superellipse/);
  assert.match(design, /8px\/16px\/32px hierarchy/);
  assert.match(design, /Use standard CSS `border-radius` geometry consistently across browsers/);
  assert.match(design, /do not apply `corner-shape`, superellipse, corner smoothing/);
  assert.match(design, /Modal and drawer headers use the shared sticky-header contract/);
});

test("dialogs use a restrained blur and respect reduced transparency", async () => {
  const [styles, primitives, showcase, design] = await Promise.all([
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("../components/primitives.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/design/ModalShowcase.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /\.dialog-scrim\s*\{[\s\S]*backdrop-filter:\s*blur\(4px\)/);
  assert.match(styles, /@media \(prefers-reduced-transparency: reduce\)[\s\S]*\.dialog-scrim\s*\{[\s\S]*backdrop-filter:\s*none/);
  assert.match(primitives, /className="dialog-scrim fixed inset-0 bg-white\/30"/);
  assert.match(showcase, /Button, Dialog, Icon/);
  assert.match(showcase, /<Dialog/);
  assert.doesNotMatch(primitives, /backdrop-blur-sm/);
  assert.doesNotMatch(showcase, /backdrop-blur-sm/);
  assert.match(design, /Dialog scrims use a restrained 4px backdrop blur/);
});

test("modal and stacked surfaces scale only their underlay", async () => {
  const [styles, app, primitives, productDrawer, stockDrawer, transactionDrawer, posDrawer, design] = await Promise.all([
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("../App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/primitives.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/product/ProductFilterDrawer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/stock/StockFilterDrawer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/transactions/TransactionFilterDrawer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/pos/PosFilterDrawer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
  ]);

  assert.match(app, /className="app-depth-surface/);
  assert.match(primitives, /export function useOverlayDepth\(active\)/);
  assert.match(primitives, /overlayDepthCount \+= 1/);
  assert.match(primitives, /useOverlayDepth\(isVisible\)/);
  assert.match(primitives, /return createPortal\(/);
  assert.match(styles, /body\.overlay-depth-active \.app-depth-surface\s*\{\s*transform:\s*scale\(0\.985\)/);
  assert.match(styles, /\.retail-pos-workspace:has\(\.retail-pos-cart-pane\.is-open\) \.retail-pos-catalog-pane\s*\{\s*transform:\s*scale\(0\.985\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*body\.overlay-depth-active \.app-depth-surface,[\s\S]*transform:\s*none/);

  for (const drawer of [productDrawer, stockDrawer, transactionDrawer, posDrawer]) {
    assert.match(drawer, /useOverlayDepth\(open\)/);
  }

  assert.match(design, /scales only its underlying content to `0\.985` over 220ms/);
});
