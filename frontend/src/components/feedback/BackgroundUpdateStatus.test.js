import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("background update status is announced without visual chrome", async () => {
  const source = await readFile(new URL("./BackgroundUpdateStatus.jsx", import.meta.url), "utf8");
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /className="sr-only"/);
  assert.doesNotMatch(source, /animate-pulse|Badge/);
});

test("operational pages use the quiet shared background status", async () => {
  const pages = [
    "../../pages/DashboardPage.jsx",
    "../../pages/ProductsPage.jsx",
    "../../pages/RetailPosPage.jsx",
    "../../pages/SettingsPage.jsx",
    "../../pages/StockPage.jsx",
    "../../pages/TransactionsPage.jsx",
  ];

  for (const page of pages) {
    const source = await readFile(new URL(page, import.meta.url), "utf8");
    assert.match(source, /BackgroundUpdateStatus/);
    assert.doesNotMatch(source, /function UpdatingBadge|animate-pulse.*Memperbarui/s);
    assert.doesNotMatch(source, /isUpdating[^\n?]*\? "opacity-60/);
  }
});
