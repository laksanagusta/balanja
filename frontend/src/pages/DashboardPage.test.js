import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard owns a full-height scrolling container inside the app shell", async () => {
  const source = await readFile(new URL("./DashboardPage.jsx", import.meta.url), "utf8");

  assert.match(source, /className="h-full overflow-auto bg-app-bg"/);
  assert.doesNotMatch(source, /className="min-h-full overflow-auto bg-app-bg"/);
});

test("dashboard requests server-side analytics", async () => {
  const source = await readFile(new URL("./DashboardPage.jsx", import.meta.url), "utf8");

  assert.match(source, /getDashboardSummary/);
  assert.doesNotMatch(source, /buildDashboardAnalytics/);
});

test("dashboard low-stock insight provides a direct stock-management handoff", async () => {
  const dashboard = await readFile(new URL("./DashboardPage.jsx", import.meta.url), "utf8");
  const panel = await readFile(new URL("../components/dashboard/LowStockPanel.jsx", import.meta.url), "utf8");

  assert.match(dashboard, /function DashboardPage\(\{ onNavigate \}\)/);
  assert.match(dashboard, /import \{ formatPrice, routes \}/);
  assert.match(dashboard, /onManageStock=\{\(\) => onNavigate\(routes\.stock\)\}/);
  assert.match(panel, /function LowStockPanel\(\{ products, onManageStock \}\)/);
  assert.match(panel, /Kelola stok/);
  assert.match(panel, /products\.length && onManageStock/);
});
