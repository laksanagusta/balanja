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

test("rounded rectangles use 60 percent smoothing with a 20 percent modal and drawer exception", async () => {
  const [styles, tokens, design] = await Promise.all([
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("../data.js", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /--corner-smoothing:\s*60%;/);
  assert.match(styles, /--corner-superellipse:\s*2\.0036;/);
  assert.match(styles, /--corner-smoothing-overlay:\s*20%;/);
  assert.match(styles, /--corner-superellipse-overlay:\s*1\.4179;/);
  assert.match(styles, /--radius-control:\s*8px;/);
  assert.match(styles, /--radius-card:\s*16px;/);
  assert.match(styles, /--radius-panel:\s*32px;/);
  assert.match(styles, /@supports \(corner-shape: superellipse\(2\.0036\)\)/);
  assert.match(styles, /\*,\s*\*::before,\s*\*::after\s*\{\s*corner-shape:\s*superellipse\(var\(--corner-superellipse\)\);/);
  assert.match(styles, /\.corner-smoothing-overlay\s*\{\s*corner-shape:\s*superellipse\(var\(--corner-superellipse-overlay\)\);/);
  assert.match(styles, /\.overlay-sticky-header\s*\{\s*position:\s*sticky;\s*inset-block-start:\s*0;/);
  assert.match(styles, /\.rounded-full,\s*\.corner-shape-round,\s*\.faq-toggle-icon::before,\s*\.faq-toggle-icon::after\s*\{\s*corner-shape:\s*round;/);
  assert.match(tokens, /\["XS - Controls", "--radius-control", "8px"\]/);
  assert.match(tokens, /\["S - Cards & Inputs", "--radius-card", "16px"\]/);
  assert.match(tokens, /\["M - Modals & Panels", "--radius-panel", "32px"\]/);
  assert.match(tokens, /\["Corner smoothing", "--corner-smoothing", "60%"\]/);
  assert.match(tokens, /\["Superellipse K", "--corner-superellipse", "2\.0036"\]/);
  assert.match(tokens, /\["Overlay smoothing", "--corner-smoothing-overlay", "20%"\]/);
  assert.match(tokens, /\["Overlay superellipse K", "--corner-superellipse-overlay", "1\.4179"\]/);
  assert.match(design, /8px\/16px\/32px radius hierarchy/);
  assert.match(design, /60% Apple-style smoothing/);
  assert.match(design, /corner-shape: superellipse\(2\.0036\)/);
  assert.match(design, /Modal and drawer surfaces are the sole smoothing exception/);
  assert.match(design, /corner-shape: superellipse\(1\.4179\)/);
  assert.match(design, /Modal and drawer headers use the shared sticky-header contract/);
  assert.match(design, /Full-radius circles, avatars, pills, progress tracks, and handles retain `corner-shape: round`/);
});
