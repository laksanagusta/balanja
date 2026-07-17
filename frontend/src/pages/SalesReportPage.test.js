import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("sales report page owns fetch, retained update, export, and handoff lifecycles", async () => {
  const source = await readFile(new URL("./SalesReportPage.jsx", import.meta.url), "utf8");
  assert.match(source, /defaultReportFilters/);
  assert.match(source, /new AbortController/);
  assert.match(source, /getSalesReport\(\{ \.\.\.appliedFilters, signal: controller\.signal \}\)/);
  assert.match(source, /!report && loading/);
  assert.match(source, /isUpdating=\{loading && Boolean\(report\)\}/);
  assert.match(source, /CSV berhasil dibuat/);
  assert.match(source, /CSV gagal dibuat/);
  assert.match(source, /reportSnapshot/);
  assert.match(source, /filters: \{ \.\.\.appliedFilters \}/);
  assert.match(source, /resolvedFilters/);
  assert.match(source, /transactionHandoff\(resolvedFilters\)/);
  assert.match(source, /downloadSalesReport\(resolvedFilters, kind\)/);
  assert.match(source, /refreshError/);
  assert.match(source, /hasUnappliedChanges/);
  assert.doesNotMatch(source, /opacity-60/);
  assert.doesNotMatch(source, /components\/design/);
	assert.match(source, /aria-busy=\{loading\}/);
	assert.match(source, /Laporan gagal dimuat/);
});
