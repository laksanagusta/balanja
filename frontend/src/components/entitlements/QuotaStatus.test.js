import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("quota status covers warning, exhausted, unavailable, and paid states", async () => {
  const source = await readFile(new URL("./QuotaStatus.jsx", import.meta.url), "utf8");
  assert.match(source, /transactionsUsed >= 45/);
  assert.match(source, /transactionsUsed >= 40/);
  assert.match(source, /Kuota trial telah habis/);
  assert.match(source, /Status paket belum dapat diperiksa/);
  assert.match(source, /paid_active/);
  assert.match(source, /upgrade_whatsapp_clicked/);
  assert.match(source, /upgrade_email_clicked/);
});
