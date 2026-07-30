import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { features, faqs } from "../landing/content.js";

test("landing content covers verified retail workflows", () => {
  assert.equal(features.length, 5);
  assert.deepEqual(
    features.map((feature) => feature.title),
    [
      "Layani pembeli tanpa pindah layar",
      "Katalog yang mudah dirapikan",
      "Temukan transaksi saat dibutuhkan",
      "Lihat kondisi toko sekilas",
      "Scan barcode, kurangi salah pilih",
    ],
  );
  assert.equal(faqs.length, 6);
});

test("landing page keeps the approved hero and public calls to action", async () => {
  const source = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const faq = await readFile(new URL("../landing/FaqSection.jsx", import.meta.url), "utf8");

  assert.match(source, /Fitur baru: Scan barcode langsung dari kasir/);
  assert.match(source, /Jualan rapi/);
  assert.match(source, /Stok terkendali/);
  assert.match(source, /Toko lebih tenang/);
  assert.match(source, /Mulai kelola toko/);
  assert.match(source, /Lihat cara kerjanya/);
  assert.match(source, /Satu alur, bukan banyak catatan/);
  assert.match(source, /Siapkan toko, layani pembeli, pantau hasilnya/);
  assert.match(source, /Siap membuat operasional toko lebih rapi/);
  assert.doesNotMatch(source, /closing-cta-gradient\.png/);
  assert.match(source, /lg:aspect-\[720\/406\]/);
  assert.match(source, /rounded-panel bg-accent/);
  assert.doesNotMatch(source, /bg-black\/55/);
  assert.match(source, /text-white\/75/);
  assert.match(source, /routes\.login/);
  assert.match(source, /id="fitur"/);
  assert.match(source, /id="cara-kerja"/);
  assert.match(source, /© balanja · v0\.1\.4/);
  assert.match(source, /marketing-reveal w-full px-4 sm:px-6/);
  assert.match(source, /relative mx-auto max-w-6xl overflow-hidden rounded-panel/);
  assert.doesNotMatch(source, />Akses</);
  assert.match(source, /mt-12 flex flex-col gap-2 pt-5 font-mono text-xs/);
  assert.doesNotMatch(source, /\bborder-t\b/);
  assert.match(faq, /id="faq"/);
});

test("design system owns the solid closing CTA treatment", async () => {
  const showcase = await readFile(new URL("../components/design/MarketingPatternsShowcase.jsx", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.doesNotMatch(showcase, /closing-cta-gradient\.png/);
  assert.match(showcase, /aspect-\[720\/406\]/);
  assert.match(showcase, /rounded-panel bg-accent/);
  assert.match(showcase, /Closing CTA on a quiet solid surface/);
  assert.match(designGuide, /closing landing CTA uses a quiet solid near-black `accent` surface/);
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

test("POS mockup uses neutral placeholders instead of product photos", async () => {
  const mockup = await readFile(new URL("../landing/PosProductMockup.jsx", import.meta.url), "utf8");

  assert.match(mockup, /Shampoo|Susu|Snack|Air Mineral/);
  assert.match(mockup, /function ProductImagePlaceholder/);
  assert.match(mockup, /name="image"/);
  assert.doesNotMatch(mockup, /https:\/\/images\.unsplash\.com\//);
  assert.doesNotMatch(mockup, /<img\b/);
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
  assert.match(css, /header-compact-action:active \.header-compact-action-surface[\s\S]*scale\(0\.98\)/);
  assert.match(css, /header-compact-action:active \.header-compact-action-surface[\s\S]*scale\(0\.97\)/);
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

test("primary button uses the global flat surface and press feedback", async () => {
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const primaryStart = css.indexOf(".primary-button {");
  const primaryBase = css.slice(primaryStart, css.indexOf(".primary-button::before", primaryStart));
  const primaryInteraction = css.slice(css.indexOf(".primary-button:active", primaryStart));

  assert.match(primaryBase, /box-shadow: none/);
  assert.match(primaryBase, /text-shadow: none/);
  assert.match(primaryInteraction, /scale\(0\.97\)/);
  assert.doesNotMatch(css, /--primary-button-ring|--primary-button-far-shadow|checkout-3d/);
});

test("landing keeps the retail backdrop while product items remain placeholders", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const mockup = await readFile(new URL("../landing/PosProductMockup.jsx", import.meta.url), "utf8");

  assert.match(page, /hero-ascii-magic-5\.png/);
  assert.match(page, /<PosProductMockup \/>/);
  assert.doesNotMatch(mockup, /\bpriority\b/);
  assert.doesNotMatch(mockup, /<img\b/);
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
  assert.match(design, /neutral placeholder/i);
  assert.match(showcase, /header-compact-action/);
  assert.match(showcase, /faq-toggle-icon/);
});
