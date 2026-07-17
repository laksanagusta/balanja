import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Retail POS consumes production components", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /components\/design\/.*Showcase/);
  assert.match(source, /<ProductCatalog/);
  assert.doesNotMatch(source, /allowRepeatAdd|showStepper/);
  assert.doesNotMatch(source, /useUser/);
});

test("search and cash controls expose accessible form state", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");

  assert.match(source, /aria-label="Cari produk atau barcode"/);
  assert.match(source, /aria-keyshortcuts="Meta\+K Control\+K"/);
  assert.match(source, /focus-within:outline-2/);
  assert.match(source, /error=\{visibleCashError\}/);
  assert.match(source, /name:\s*"cashReceived"/);
  assert.match(source, /aria-pressed=\{category === item\}/);
});

test("status copy and motion follow the interface contract", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");

  assert.match(source, /Menyelesaikan…/);
  assert.match(source, /role="status"/);
  assert.match(source, /motion-reduce:animate-none/);
  assert.doesNotMatch(source, /Cari produk atau barcode\.\.\.|Menyelesaikan\.\.\./);
});

test("cart barcode scanning stays inside the visible cashier workspace", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");

  assert.match(source, /import BarcodeScanner/);
  assert.match(source, /Pindai barcode/);
  assert.match(source, /if \(!scannerOpen\) return/);
  assert.match(source, /store\.loadProducts\(\{ signal: controller\.signal \}\)/);
  assert.match(source, /<BarcodeScanner/);
  assert.match(source, /store\.addToCart\(code\)/);
  assert.match(source, /toast\.success\("Produk ditambahkan dari barcode"/);
  assert.match(source, /toast\.error\(result\?\.error \|\| "Barcode gagal dipindai"/);
  const scanner = source.slice(source.indexOf("<BarcodeScanner"));
  assert.doesNotMatch(scanner.slice(scanner.indexOf("onDetected=")), /setScannerOpen\(false\)/);
});

test("the design system documents and demonstrates the production POS contract", async () => {
  const design = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");
  const showcase = await readFile(
    new URL("../components/design/POSPatterns.jsx", import.meta.url),
    "utf8",
  );

  assert.match(design, /showcase modules consume production components/i);
  assert.match(design, /content-visibility/);
  assert.match(design, /aria-pressed/);
  assert.match(showcase, /PosProductCard/);
});
