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
  assert.match(styles, /--radius-panel:\s*24px;/);
  assert.doesNotMatch(styles, /corner-shape|corner-smoothing|corner-superellipse/);
  assert.match(styles, /\.overlay-sticky-header\s*\{\s*position:\s*sticky;\s*inset-block-start:\s*0;/);
  assert.match(tokens, /\["XS - Controls", "--radius-control", "8px"\]/);
  assert.match(tokens, /\["S - Cards & Inputs", "--radius-card", "16px"\]/);
  assert.match(tokens, /\["M - Modals & Panels", "--radius-panel", "24px"\]/);
  assert.doesNotMatch(tokens, /corner-smoothing|corner-superellipse/);
  assert.match(design, /8px\/16px\/24px radius hierarchy/);
  assert.match(design, /Use standard CSS `border-radius` geometry consistently across browsers/);
  assert.match(design, /do not apply `corner-shape`, superellipse, corner smoothing/);
  assert.match(design, /Modal and drawer headers use the shared sticky-header contract/);
});
