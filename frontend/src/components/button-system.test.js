import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const operationalButtonSources = [
  "./primitives.jsx",
  "./AppShell.jsx",
  "./TablePagination.jsx",
  "./TableFilterPopover.jsx",
  "../pages/DashboardPage.jsx",
  "../pages/RetailPosPage.jsx",
];

test("button surfaces use the global flat hierarchy without elevation utilities", async () => {
  const [css, design, ...sources] = await Promise.all([
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
    ...operationalButtonSources.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  ]);

  assert.match(css, /\.primary-button\s*\{[\s\S]*box-shadow:\s*none;[\s\S]*text-shadow:\s*none;/);
  assert.match(css, /\.primary-button::before,[\s\S]*\.primary-button::after\s*\{[\s\S]*display:\s*none;/);
  assert.doesNotMatch(css, /--primary-button-(?:ring|inner-shadow|close-shadow|far-shadow)|checkout-3d/);
  assert.match(design, /Every button follows one Uber-inspired flat system/);

  for (const source of sources) {
    assert.doesNotMatch(source, /<(?:button|Button)\b[^>]*\bshadow-(?:low|accent)\b/s);
  }
});

test("standard button radius stays on the shared 8px token at every responsive size", async () => {
  const [css, primitives, design, retailPos, productCard, dashboard, settings] = await Promise.all([
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("./primitives.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
    readFile(new URL("../pages/RetailPosPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("./pos/ProductCard.jsx", import.meta.url), "utf8"),
    readFile(new URL("../pages/DashboardPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../pages/SettingsPage.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(css, /--radius-button:\s*var\(--radius-control\);/);
  assert.match(css, /\.pos-product-card \.product-add-button \.button-label-pop\s*\{[\s\S]*border-radius:\s*var\(--radius-button\);/);
  assert.match(primitives, /const sizes = \{[\s\S]*rounded-button[\s\S]*xl:/);
  assert.match(design, /Button radius never changes at a viewport or container breakpoint/);

  for (const source of [primitives, retailPos, productCard, dashboard, settings]) {
    assert.doesNotMatch(source, /<(?:button|Button)\b[^>]*\b(?:sm|md|lg|xl|2xl):rounded-/s);
    assert.doesNotMatch(source, /<(?:button|Button)\b[^>]*\brounded-(?:md|card|panel)\b/s);
  }
});
