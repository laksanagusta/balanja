import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizePath, routeAccess } from "../routing.js";

test("sales report route is private and wired into app navigation", async () => {
  assert.equal(routeAccess("/reports/sales"), "private");
  assert.equal(normalizePath("/reports/sales", false), "/login");
  assert.equal(normalizePath("/reports/sales", true), "/reports/sales");

  const [app, shared] = await Promise.all([
    readFile(new URL("../App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../shared.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(app, /routes\.reportsSales/);
  assert.match(shared, /Laporan Penjualan/);
  assert.match(shared, /label: "Analisis"/);
});
