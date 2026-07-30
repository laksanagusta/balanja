import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard showcase documents the production chart-role mapping", async () => {
  const source = await readFile(new URL("./DashboardPatternsShowcase.jsx", import.meta.url), "utf8");

  assert.match(source, /Pendapatan memakai violet sebagai satu-satunya chart utama/);
  assert.match(source, /produk terlaris memakai ranked list/);
  assert.match(source, /analisis metode pembayaran tetap berada di Laporan Penjualan/);
  assert.match(source, /Nilai KPI tidak dipotong/);
  assert.match(source, /<LowStockPanel/);
});
