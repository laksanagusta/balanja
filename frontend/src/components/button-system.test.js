import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const operationalButtonSources = [
  "./primitives.jsx",
  "./AppShell.jsx",
  "./TablePagination.jsx",
  "./TableFilterPopover.jsx",
  "./pos/PosFilterDrawer.jsx",
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

test("mobile controls follow the shared height and hit-area contract", async () => {
  const [css, primitives, buttonShowcase, formShowcase, design] = await Promise.all([
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("./primitives.jsx", import.meta.url), "utf8"),
    readFile(new URL("./design/ButtonShowcase.jsx", import.meta.url), "utf8"),
    readFile(new URL("./design/FormShowcase.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
  ]);

  for (const token of [
    "--control-height-mobile-button-hit: 36px",
    "--control-height-mobile-button: 36px",
    "--control-height-mobile-button-large: 52px",
    "--control-height-mobile-compact: 36px",
    "--control-height-mobile-field-hit: 36px",
    "--control-height-mobile-input: 36px",
    "--control-height-mobile-input-large: 56px",
    "--control-height-mobile-search: 44px",
  ]) {
    assert.match(css, new RegExp(token));
  }

  assert.doesNotMatch(css, /@media \(max-width: 767px\)/);
  assert.match(css, /\.ui-button\[data-mobile-size="compact"\][\s\S]*\.ui-button-mobile-hit-area/);
  assert.match(css, /\.ui-button\[data-mobile-size="standard"\][\s\S]*\.ui-button-mobile-hit-area/);
  assert.match(css, /inset-block: var\(--control-inset-mobile-compact-hit\)/);
  assert.match(primitives, /data-mobile-size=\{resolvedMobileSize\}/);
  assert.match(primitives, /data-ui-size=\{size\}/);
  assert.match(primitives, /className="ui-button-mobile-hit-area"/);
  assert.match(primitives, /radius = "rounded-control"/);
  assert.match(buttonShowcase, /Standard radius/);
  assert.match(buttonShowcase, /Utility radius/);
  assert.match(buttonShowcase, /Primary besar · 52/);
  assert.match(buttonShowcase, /Standard · 36/);
  assert.match(formShowcase, /<Input size="large"/);
  assert.match(design, /standard button, input, and dropdown surfaces and hit areas are 36px/);
  assert.match(design, /large primary buttons are 52px; and large inputs are 56px/);
  assert.match(design, /`control` is 10px for shared buttons/);
});
