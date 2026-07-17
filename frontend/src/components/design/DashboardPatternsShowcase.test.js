import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard showcase documents the production chart-role mapping", async () => {
  const source = await readFile(new URL("./DashboardPatternsShowcase.jsx", import.meta.url), "utf8");

  assert.match(source, /Pendapatan memakai violet/);
  assert.match(source, /produk terlaris memakai hijau/);
  assert.match(source, /metode pembayaran memakai violet, mint, dan amber/);
  assert.match(source, /tetap terbaca tanpa bergantung pada warna/);
});
