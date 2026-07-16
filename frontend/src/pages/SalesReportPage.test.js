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
  assert.match(source, /transactionHandoff\(appliedFilters\)/);
  assert.doesNotMatch(source, /components\/design/);
	assert.match(source, /aria-busy=\{loading\}/);
	assert.match(source, /motion-reduce:transition-none/);
	assert.match(source, /Laporan gagal dimuat/);
});
