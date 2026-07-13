import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { features, faqs } from "../landing/content.js";

test("landing content covers verified retail workflows", () => {
  assert.equal(features.length, 6);
  assert.deepEqual(
    features.map((feature) => feature.title),
    [
      "Kasir cepat",
      "Katalog produk",
      "Stok tercatat",
      "Riwayat transaksi",
      "Dashboard penjualan",
      "Pemindaian barcode",
    ],
  );
  assert.equal(faqs.length, 6);
});

test("landing page keeps the approved hero and public calls to action", async () => {
  const source = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const faq = await readFile(new URL("../landing/FaqSection.jsx", import.meta.url), "utf8");

  assert.match(source, /Satu tempat untuk jualan/);
  assert.match(source, /stok, dan transaksi/);
  assert.match(source, /Mulai dengan Balanja/);
  assert.match(source, /routes\.login/);
  assert.match(source, /id="fitur"/);
  assert.match(source, /id="cara-kerja"/);
  assert.match(faq, /id="faq"/);
});

test("hero uses the faithful POS mockup over the generated retail image", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const mockup = await readFile(new URL("../landing/PosProductMockup.jsx", import.meta.url), "utf8");

  assert.match(page, /hero-retail-bg\.webp/);
  assert.match(page, /<PosProductMockup/);
  assert.match(mockup, /Point of Sale/);
  assert.match(mockup, /Search products or barcode/);
  assert.match(mockup, /Total Payment/);
  assert.match(mockup, /Complete sale/);
});
