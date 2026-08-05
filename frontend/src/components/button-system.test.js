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
  assert.match(css, /\.form-actions\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /\.form-actions:has\(> :nth-child\(2\)\)\s*\{[\s\S]*repeat\(2, minmax\(0, 1fr\)\);/);
  assert.doesNotMatch(css, /--primary-button-(?:ring|inner-shadow|close-shadow|far-shadow)|checkout-3d/);
  assert.match(design, /Every button follows one Family-influenced flat system/);

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
    "--control-height-mobile-button-hit: 44px",
    "--control-height-mobile-button: 44px",
    "--control-height-mobile-button-large: 48px",
    "--control-height-mobile-compact: 36px",
    "--control-height-mobile-field-hit: 44px",
    "--control-height-mobile-input: 44px",
    "--control-height-mobile-input-large: 48px",
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
  assert.match(primitives, /xs: "h-6 gap-1 px-2 text-xs leading-4"/);
  assert.match(primitives, /sm: "h-9 gap-1\.5 px-2\.5 text-sm leading-5"/);
  assert.match(primitives, /const resolvedRadius = radius \|\| \(compactVisual \? "rounded-control" : "rounded-full"\)/);
  assert.match(primitives, /base: "h-12 gap-2 px-3\.5 text-base leading-6 tracking-\[-0\.01em\]"/);
  assert.match(buttonShowcase, /Control radius/);
  assert.match(buttonShowcase, /Utility radius/);
  assert.match(buttonShowcase, /Standard button/);
  assert.match(buttonShowcase, /Primary besar · 48/);
  assert.match(buttonShowcase, /Standard · 48/);
  assert.match(buttonShowcase, /16px semibold text and 24px line-height/);
  assert.match(buttonShowcase, /Compact · 14px · 36\/44/);
  assert.match(buttonShowcase, /two equal columns when there are two buttons/);
  assert.match(formShowcase, /<Input size="large"/);
  assert.match(design, /standard text buttons use a 48px visual and interaction height/);
  assert.match(design, /inputs, dropdowns, and search fields use 44px/);
  assert.match(design, /`control` is 10px for inputs/);
});
