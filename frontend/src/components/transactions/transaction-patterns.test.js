import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("transaction filters keep changes as drafts until apply", async () => {
  const source = await readFile(new URL("./TransactionFilterDrawer.jsx", import.meta.url), "utf8");

  assert.match(source, /setDraftPaymentMethod\(paymentMethod\)/);
  assert.match(source, /setDraftDateFrom\(dateFrom\)/);
  assert.match(source, /setDraftDateTo\(dateTo\)/);
  assert.match(source, /const applyFilters/);
  assert.match(source, /onPaymentMethodChange\?\.\(draftPaymentMethod\)/);
  assert.match(source, /onDateFromChange\?\.\(draftDateFrom\)/);
  assert.match(source, /onDateToChange\?\.\(draftDateTo\)/);
  assert.match(source, />\s*Terapkan\s*</);
  assert.match(source, />\s*Atur ulang\s*</);
});

test("transaction history uses full-width cards with amount-first hierarchy", async () => {
  const source = await readFile(new URL("./TransactionCardList.jsx", import.meta.url), "utf8");

  assert.match(source, /className="grid gap-3"/);
  assert.match(source, /rounded-card border border-border bg-surface p-4/);
  assert.doesNotMatch(source, /rounded-panel/);
  assert.doesNotMatch(source, /grid-cols-/);
  assert.match(source, /Lihat detail transaksi/);
  assert.match(source, /formatPrice\(transaction\.total\)/);
  assert.match(source, /transaction\.cashierName/);
  assert.match(source, /Tidak diketahui/);
  assert.match(source, /status === "completed"\) return null/);
  assert.match(source, /TransactionProductStack/);
  assert.match(source, /items\.slice\(0, 3\)/);
  assert.match(source, /ProductImage/);
  assert.match(source, /\+\{extraCount\}/);
  assert.doesNotMatch(source, /cashierUserId/);
  assert.doesNotMatch(source, />\s*Detail\s*</);
  assert.doesNotMatch(source, /DataTable|<table/);
});
