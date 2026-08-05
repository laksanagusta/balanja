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
  const charts = await readFile(new URL("../components/dashboard/DashboardCharts.jsx", import.meta.url), "utf8");
  const panel = await readFile(new URL("../components/dashboard/LowStockPanel.jsx", import.meta.url), "utf8");

  assert.match(dashboard, /function DashboardPage\(\{ onNavigate \}\)/);
  assert.match(dashboard, /import \{ formatPrice, routes \}/);
  assert.match(dashboard, /onManageStock=\{\(\) => onNavigate\(routes\.stock\)\}/);
  assert.match(panel, /function LowStockPanel\(\{ products = \[\], count = products\.length, onManageStock \}\)/);
  assert.match(panel, /Kelola stok/);
  assert.match(panel, /hasLowStock && onManageStock/);
  assert.match(dashboard, /count=\{visibleAnalytics\.lowStockCount\}/);
  assert.match(panel, /Menampilkan \{products\.length\} produk dengan stok terendah/);
  assert.match(charts, /<Line dataKey="revenue"[^>]*showMarkers=\{data\.length < 3\}/);
  assert.match(panel, /line-clamp-2 text-sm font-semibold text-text/);
  assert.match(panel, /title=\{product\.name\}/);
});

test("dashboard home prioritizes today, attention, and direct report handoff", async () => {
  const dashboard = await readFile(new URL("./DashboardPage.jsx", import.meta.url), "utf8");
  const subscription = await readFile(new URL("../components/dashboard/SubscriptionCard.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../components/design/DashboardPatternsShowcase.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const charts = await readFile(new URL("../components/dashboard/DashboardCharts.jsx", import.meta.url), "utf8");
  const metric = await readFile(new URL("../components/dashboard/DashboardKpiCard.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(dashboard, /\{ value: 1, label: "Hari ini" \}/);
  assert.match(dashboard, /React\.useState\(1\)/);
  assert.doesNotMatch(dashboard, /PaymentMixPanel/);
  assert.doesNotMatch(dashboard, /label="Stok menipis"/);
  assert.match(dashboard, /onViewReport=\{\(\) => onNavigate\(routes\.reportsSales\)\}/);
  assert.match(dashboard, /<SubscriptionCard entitlement=\{store\.entitlement\} contacts=\{subscriptionContacts\} \/>/);
  assert.match(subscription, /status !== "paid_active"/);
  assert.match(subscription, /dashboard-subscription-card/);
  assert.match(subscription, /dashboard-subscription-trigger/);
  assert.match(subscription, /Drawer\.Root/);
  assert.match(subscription, /Drawer\.Content/);
  assert.match(subscription, /max-w-xl/);
  assert.match(subscription, /gap-8/);
  assert.match(subscription, /safe-area-inset-bottom/);
  assert.match(subscription, /bg-surface-muted p-4 smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300\/30[\s\S]*Yang kamu dapatkan/);
  assert.match(subscription, /Rp99\.000/);
  assert.match(subscription, /Mulai dengan Pro/);
  assert.match(subscription, /Upgrade ke Pro/);
  assert.doesNotMatch(subscription, /FloatingPopover/);
  assert.match(showcase, /<SubscriptionCard preview \/>/);
  assert.match(css, /\.dashboard-subscription-trigger[\s\S]*radial-gradient/);
  assert.doesNotMatch(subscription, /dashboard-subscription-drawer-hero/);
  assert.match(charts, /<ol className="mt-3">/);
  assert.doesNotMatch(charts, /\bdivide-y\b/);
  assert.match(charts, /Lihat laporan penjualan/);
  assert.match(charts, /Data rinci tren pendapatan/);
  assert.match(charts, /aria-describedby=\{descriptionId\}/);
  assert.doesNotMatch(metric, /truncate/);
  assert.match(dashboard, /aria-labelledby="dashboard-heading"/);
  assert.match(dashboard, /mobile-compact-control relative inline-flex/);
  assert.match(dashboard, /summaryError/);
  assert.match(dashboard, /Coba lagi/);
  assert.match(dashboard, /xl:col-start-1/);
  assert.match(dashboard, /xl:col-start-5/);
  assert.match(showcase, /count=\{7\}/);
  assert.match(design, /complete screen-reader data table/);
  assert.match(design, /acts as the authenticated home, not a duplicate sales report/);
  assert.match(design, /compact subscription trigger[\s\S]*bottom drawer/);
});

test("dashboard loading and failure states preserve the actionable contract", async () => {
  const dashboard = await readFile(new URL("./DashboardPage.jsx", import.meta.url), "utf8");
  const skeleton = await readFile(new URL("../components/page-loading.jsx", import.meta.url), "utf8");

  assert.match(dashboard, /localizedDashboardError/);
  assert.match(dashboard, /if \(controller\.signal\.aborted\) return;/);
  assert.match(dashboard, /DashboardErrorState/);
  assert.match(dashboard, /role="alert"/);
  assert.match(dashboard, /showSubscription=\{store\.entitlement\?\.status !== "paid_active"\}/);
  assert.match(skeleton, /function DashboardPageSkeleton\(\{ showSubscription = true \}\)/);
  assert.match(skeleton, /Memuat periode dashboard/);
  assert.match(skeleton, /Indikator kinerja utama/);
  assert.match(skeleton, /showSubscription \?/);
  assert.match(skeleton, /xl:col-start-5/);
});
