import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  formatRelativeTime,
  getLowStockProducts,
  getMovementPresentation,
  getStockProgress,
} from "./stock-overview.js";

test("low stock products include only active products at or below the threshold", () => {
  const result = getLowStockProducts([
    { id: "healthy", name: "Healthy", active: true, stock: 11 },
    { id: "inactive", name: "Inactive", active: false, stock: 1 },
    { id: "ten", name: "Ten", active: true, stock: 10 },
    { id: "two", name: "Two", active: true, stock: 2 },
  ]);

  assert.deepEqual(result.map((product) => product.id), ["two", "ten"]);
});

test("low stock products expose configured variants independently", () => {
  const result = getLowStockProducts([{
    id: "tea",
    name: "Tea",
    active: true,
    stock: 99,
    attributesConfig: [{ name: "Ukuran", options: ["M", "L"] }],
    variants: [
      { id: "m", attributes: { Ukuran: "M" }, stock: 2, active: true },
      { id: "l", attributes: { Ukuran: "L" }, stock: 12, active: true },
    ],
  }]);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "tea");
  assert.equal(result[0].variantId, "m");
  assert.equal(result[0].variantAttributes, "Ukuran: M");
  assert.equal(result[0].stock, 2);
});

test("stock progress is bounded to the available track", () => {
  assert.equal(getStockProgress(-2, 10), 0);
  assert.equal(getStockProgress(4, 10), 40);
  assert.equal(getStockProgress(14, 10), 100);
});

test("movement presentation distinguishes inbound, outbound, and adjustments", () => {
  assert.deepEqual(getMovementPresentation("restock"), { label: "Stok masuk", icon: "inbound", tone: "success" });
  assert.deepEqual(getMovementPresentation("reduce"), { label: "Stok keluar", icon: "outbound", tone: "warning" });
  assert.deepEqual(getMovementPresentation("set_exact"), { label: "Penyesuaian stok", icon: "adjust", tone: "neutral" });
});

test("relative activity time uses concise Indonesian labels", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");
  assert.equal(formatRelativeTime("2026-07-29T11:59:40.000Z", now), "Baru saja");
  assert.match(formatRelativeTime("2026-07-29T10:00:00.000Z", now), /2 jam/);
});

test("stock overview keeps activity to two lines and owns load-more disclosure", async () => {
  const source = await readFile(new URL("../components/stock/StockOverview.jsx", import.meta.url), "utf8");

  assert.match(source, /Muat lebih banyak/);
  assert.match(source, /hasMoreMovements/);
  assert.match(source, /movement\.productName[\s\S]*movement\.reason[\s\S]*actor/);
  assert.doesNotMatch(source, /line-clamp-1/);
});

test("stock alert and activity cards use the smooth shadow ring instead of a border edge", async () => {
  const source = await readFile(new URL("../components/stock/StockOverview.jsx", import.meta.url), "utf8");

  assert.match(source, /rounded-card bg-surface p-4 smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300\/30/);
  assert.match(source, /grid min-h-24[\s\S]*rounded-card bg-surface p-4 smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300\/30/);
});

test("stock section headings use compact tracked JetBrains labels", async () => {
  const source = await readFile(new URL("../components/stock/StockOverview.jsx", import.meta.url), "utf8");

  assert.match(source, /sectionHeadingClassName = "font-mono text-xs font-semibold uppercase tracking-\[0\.16em\] text-text"/);
  assert.match(source, /id="low-stock-heading" className=\{sectionHeadingClassName\}/);
  assert.match(source, /id="recent-activity-heading" className=\{sectionHeadingClassName\}/);
});
