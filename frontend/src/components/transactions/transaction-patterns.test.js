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
  assert.match(source, /rounded-card bg-surface p-4 text-left smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300\/30/);
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

test("transaction detail uses a centered receipt drawer with print action", async () => {
  const [page, source, styles] = await Promise.all([
    readFile(new URL("../../pages/TransactionsPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("./TransactionReceiptDrawer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../index.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<TransactionReceiptDrawer transaction=\{selected\}/);
  assert.match(source, /<Drawer\.Root/);
  assert.match(source, /transaction-detail-drawer fixed inset-0 z-\[80\] m-auto/);
  assert.match(source, /px-2 py-2 outline-none shadow-panel sm:px-3 sm:py-3/);
  assert.match(source, /transaction-receipt-scroll relative min-h-0 h-full overflow-y-auto px-5 py-8 sm:px-8 sm:py-10/);
  assert.match(source, /transaction-receipt-handle mx-auto mb-3 mt-0/);
  assert.match(source, /transaction-receipt-paper/);
  assert.match(source, /<Drawer\.Handle[\s\S]*<header className="transaction-receipt-controls[^\"]*"[\s\S]*<div className="transaction-receipt-paper/);
  assert.match(source, /<\/div>\s*<\/div>\s*<footer className="transaction-receipt-controls[^\"]*"/);
  assert.match(source, /transaction-receipt-close[\s\S]*hover:underline/);
  assert.match(source, /font-mono text-sm font-semibold tracking-\[0\.24em\]/);
  assert.match(source, /grid gap-3 font-mono text-sm/);
  assert.match(source, /grid gap-2 font-mono text-sm/);
  assert.match(source, /compactVisual onClick=\{printReceipt\}/);
  assert.match(source, /onClick=\{printReceipt\}/);
  assert.match(source, />\s*Cetak struk\s*</);
  assert.match(source, /if \(!transaction\) return null/);
  assert.doesNotMatch(source, /ui-button-mobile-hit-area/);
  assert.doesNotMatch(source, /transaction-receipt-qr/);
  assert.doesNotMatch(source, /<Icon name="x"/);
  const paperStart = source.indexOf("<div className=\"transaction-receipt-paper");
  const paperEnd = source.indexOf("\n          </div>\n\n          <footer", paperStart);
  assert.ok(paperStart >= 0 && paperEnd > paperStart);
  assert.doesNotMatch(source.slice(paperStart, paperEnd), /transaction-receipt-controls|transaction-receipt-handle/);
  assert.match(styles, /@keyframes transaction-receipt-open/);
  assert.match(styles, /transaction-receipt-paper::before,[\s\S]*block-size: 6px/);
  assert.match(styles, /transaction-detail-drawer\[data-state="open"\][\s\S]*transaction-receipt-open/);
  assert.doesNotMatch(source, /mt-4 grid gap-4/);
  assert.doesNotMatch(source, /<Dialog/);
});
