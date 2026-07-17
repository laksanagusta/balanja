import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { features, faqs } from "../landing/content.js";

test("landing content covers verified retail workflows", () => {
  assert.equal(features.length, 5);
  assert.deepEqual(
    features.map((feature) => feature.title),
    [
      "Kasir cepat",
      "Katalog produk",
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

  assert.match(source, /Baru — mendukung pemindaian barcode/);
  assert.match(source, /Satu tempat untuk jualan/);
  assert.match(source, /stok, dan transaksi/);
  assert.match(source, /Mulai dengan Balanja/);
  assert.match(source, /routes\.login/);
  assert.match(source, /id="fitur"/);
  assert.match(source, /id="cara-kerja"/);
  assert.match(source, /© balanja · v0\.1\.4/);
  assert.match(faq, /id="faq"/);
});

test("hero uses the faithful POS mockup over the generated retail image", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const mockup = await readFile(new URL("../landing/PosProductMockup.jsx", import.meta.url), "utf8");

  assert.match(page, /hero-ascii-magic-5\.png/);
  assert.match(page, /<PosProductMockup/);
  assert.match(mockup, /Kasir/);
  assert.match(mockup, /Cari produk atau barcode/);
  assert.match(mockup, /Total pembayaran/);
  assert.match(mockup, /Selesaikan transaksi/);
});

test("POS mockup uses a fuller retail product set sourced from Unsplash", async () => {
  const mockup = await readFile(new URL("../landing/PosProductMockup.jsx", import.meta.url), "utf8");

  assert.match(mockup, /Shampoo|Susu|Snack|Air Mineral/);
  assert.ok((mockup.match(/https:\/\/images\.unsplash\.com\//g) ?? []).length >= 8);
});

test("marketing motion has an explicit reduced-motion fallback", async () => {
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");

  assert.match(css, /\.marketing-reveal/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.match(page, /scrollIntoViewRespectingMotion/);
  assert.match(page, /scrollToTopRespectingMotion/);
});

test("landing interactions keep accessible touch targets and press feedback", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const faq = await readFile(new URL("../landing/FaqSection.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(page, /public-header/);
  assert.match(page, /min-h-11/);
  assert.match(page, /press-feedback/);
  assert.match(faq, /press-feedback/);
  assert.match(css, /\.press-feedback:active/);
});

test("compact header action keeps a 44px transparent hit area without changing its visual size", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const primitives = await readFile(new URL("../components/primitives.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(page, /header-compact-action/);
  assert.match(page, /compactVisual/);
  assert.match(page, /size="sm"/);
  assert.match(primitives, /compactVisual[\s\S]*h-11/);
  assert.match(primitives, /header-compact-action-surface/);
  assert.doesNotMatch(css, /header-compact-action::after/);
});

test("public navigation does not override press feedback transition properties", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const publicHeader = page.slice(page.indexOf("function PublicHeader"), page.indexOf("export default function LandingPage"));

  assert.doesNotMatch(publicHeader, /transition-colors/);
});

test("FAQ keeps answer panels mounted and morphs a single state indicator", async () => {
  const faq = await readFile(new URL("../landing/FaqSection.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.doesNotMatch(faq, /\{isOpen && \(/);
  assert.match(faq, /faq-answer-grid/);
  assert.match(faq, /aria-hidden={!isOpen}/);
  assert.match(faq, /faq-toggle-icon/);
  assert.match(css, /\.faq-answer-grid/);
  assert.match(css, /\.faq-toggle-icon/);
});

test("marketing reveal stays concise and does not retain a permanent compositor layer", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const revealRule = css.slice(css.indexOf(".marketing-reveal {"), css.indexOf("@keyframes marketing-reveal"));

  assert.match(revealRule, /animation: marketing-reveal 420ms/);
  assert.doesNotMatch(revealRule, /will-change/);
  assert.match(page, /"--reveal-delay": "180ms"/);
  assert.doesNotMatch(page, /"--reveal-delay": "260ms"/);
});

test("primary button depth feedback changes transform without swapping box shadows", async () => {
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const scanHover = css.slice(css.indexOf(".scan-3d:hover {"), css.indexOf(".scan-3d:hover::before"));
  const scanActive = css.slice(css.indexOf(".scan-3d:active {"), css.indexOf(".checkout-3d"));

  assert.match(scanHover, /transform: translateY\(-1px\)/);
  assert.doesNotMatch(scanHover, /box-shadow/);
  assert.match(scanActive, /scale\(0\.97\)/);
  assert.doesNotMatch(scanActive, /box-shadow/);
});

test("POS mockup prioritizes only the leading hero imagery and lazily decodes the rest", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const mockup = await readFile(new URL("../landing/PosProductMockup.jsx", import.meta.url), "utf8");

  assert.match(page, /<PosProductMockup priority \/>/);
  assert.match(mockup, /loading=/);
  assert.match(mockup, /decoding="async"/);
  assert.match(mockup, /fetchPriority=/);
});

test("subtle text token remains readable on white marketing surfaces", async () => {
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(css, /--color-text-subtle: #6f6f6f/);
});

test("decorative POS mockup does not create a nested main landmark", async () => {
  const mockup = await readFile(new URL("../landing/PosProductMockup.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(mockup, /<main\b/);
  assert.doesNotMatch(mockup, /<\/main>/);
});

test("design system documents the landing accessibility contract", async () => {
  const design = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../components/design/MarketingPatternsShowcase.jsx", import.meta.url), "utf8");

  assert.match(design, /4\.5:1/);
  assert.match(design, /44px touch target/);
  assert.match(design, /prefers-reduced-transparency/);
  assert.match(showcase, /44px touch target/);
  assert.match(showcase, /press-feedback/);
  assert.match(design, /transparent hit area/);
  assert.match(design, /FAQ/);
  assert.match(design, /lazy/);
  assert.match(showcase, /header-compact-action/);
  assert.match(showcase, /faq-toggle-icon/);
});
