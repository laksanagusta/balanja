import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { features, faqs, navItems } from "../landing/content.js";

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
  assert.deepEqual(features.map((feature) => feature.row), ["lead", "lead", "supporting", "supporting", "supporting"]);
  assert.equal(faqs.length, 6);
  assert.deepEqual(navItems, [
    { label: "Fitur", href: "#fitur" },
    { label: "Cara kerja", href: "#cara-kerja" },
    { label: "Harga", href: "#harga" },
    { label: "FAQ", href: "#faq" },
  ]);
});

test("landing page keeps the approved hero and public calls to action", async () => {
  const source = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const faq = await readFile(new URL("../landing/FaqSection.jsx", import.meta.url), "utf8");
  const pricing = await readFile(new URL("../landing/PricingSection.jsx", import.meta.url), "utf8");

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
  assert.match(source, /rounded-panel bg-white/);
  assert.doesNotMatch(source, /bg-black\/55/);
  assert.match(source, /text-text-muted/);
  assert.match(source, /routes\.login/);
  assert.match(source, /public-skip-link/);
  assert.match(source, /id="landing-main" tabIndex=\{-1\}/);
  assert.match(source, /id="fitur"/);
  assert.match(source, /id="cara-kerja"/);
  assert.match(source, /<PricingSection contacts={pricingContacts} \/>/);
  assert.match(source, /VITE_UPGRADE_WHATSAPP_NUMBER/);
  assert.match(source, /VITE_UPGRADE_EMAIL/);
  assert.match(pricing, /id="harga"/);
  assert.match(pricing, /Satu paket Pro untuk toko yang terus berjalan/);
  assert.match(pricing, /Rp99\.000/);
  assert.match(pricing, /\/bulan/);
  assert.match(pricing, /Mulai dengan Pro/);
  assert.match(pricing, /FloatingPopover/);
  assert.match(pricing, /Kontak Wipay untuk paket Pro/);
  assert.match(source, /© WIPAY · V0\.1\.4/);
  assert.match(source, /marketing-reveal w-full px-4 sm:px-6/);
  assert.match(source, /relative mx-auto max-w-6xl overflow-hidden rounded-panel/);
  assert.doesNotMatch(source, />Akses</);
  assert.match(source, /mt-12 flex flex-col gap-2 border-t border-border pt-5 text-xs font-medium tracking-\[0\.08em\]/);
  assert.match(faq, /id="faq"/);
});

test("landing typography is scoped to Inter with the reference weights", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../components/design/MarketingPatternsShowcase.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");

  assert.match(page, /className="landing-page font-landing/);
  assert.match(showcase, /className="font-landing overflow-hidden/);
  assert.match(css, /--font-landing: Inter,/);
  assert.match(css, /\.font-landing[\s\S]*font-family: var\(--font-landing\)/);
  assert.match(css, /\.font-landing \.font-bold,[\s\S]*\.font-landing \.font-extrabold[\s\S]*font-weight: 600/);
  assert.match(html, /family=Inter:wght@400;500;600/);
  assert.match(page, /text-\[42px\] font-medium[\s\S]*sm:text-\[58px\] lg:text-\[68px\]/);
  assert.match(showcase, /text-\[42px\] font-medium[\s\S]*sm:text-\[56px\] lg:text-\[68px\]/);
  assert.doesNotMatch(page, /<span className="text-text-subtle">Toko lebih tenang\.<\/span>/);
  assert.doesNotMatch(showcase, /<span className="text-text-subtle">Toko lebih tenang\.<\/span>/);
});

test("landing typography balances headings, prettifies short copy, and uses scalable leading", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../components/design/MarketingPatternsShowcase.jsx", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(page, /text-balance/);
  assert.match(page, /text-pretty/);
  assert.match(page, /leading-\[1\.6\]/);
  assert.match(page, /max-w-\[48ch\]/);
  assert.doesNotMatch(page, /const eyebrowLabelClassName = "[^\"]*font-mono/);
  assert.doesNotMatch(page, /pt-5 font-mono text-xs/);
  assert.match(showcase, /text-balance/);
  assert.match(showcase, /text-pretty/);
  assert.match(designGuide, /feature-card descriptions cap their measure near 48ch/);
});

test("landing color roles preserve contrast on translucent chrome and success surfaces", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const tokens = await readFile(new URL("../data.js", import.meta.url), "utf8");
  const badgeShowcase = await readFile(new URL("../components/design/BadgeShowcase.jsx", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(page, /navItems\.map\(\(item\) => <a[\s\S]*text-text hover:text-accent-hover/);
  assert.match(css, /--color-success:\s*#147a42;/);
  assert.match(page, /bg-surface\/88/);
  assert.match(tokens, /\["Subtle Text", "--color-text-subtle", "#6f6f6f"\]/);
  assert.match(tokens, /\["Success", "--color-success", "#147a42"\]/);
  assert.match(badgeShowcase, /\["Success", "--color-success", "#147a42"\]/);
  assert.match(designGuide, /success text token is the darker semantic green `#147a42`/);
  assert.match(designGuide, /88% surface veil/);
});

test("design system owns the solid closing CTA treatment", async () => {
  const showcase = await readFile(new URL("../components/design/MarketingPatternsShowcase.jsx", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.doesNotMatch(showcase, /closing-cta-gradient\.png/);
  assert.match(showcase, /aspect-\[720\/406\]/);
  assert.match(showcase, /rounded-panel bg-white/);
  assert.match(showcase, /Closing CTA on a quiet solid surface/);
  assert.match(designGuide, /closing landing CTA uses a quiet solid white surface/);
  assert.match(showcase, /Pricing · one plan/);
  assert.match(showcase, /<PricingPanel showcase contacts=/);
  assert.match(showcase, /compact contact popover/);
  assert.match(designGuide, /pricing section uses one `Pro` plan/);
});

test("hero uses the faithful POS mockup over the generated retail image", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const mockup = await readFile(new URL("../landing/PosProductMockup.jsx", import.meta.url), "utf8");

  assert.match(page, /hero-ascii-magic-6\.png/);
  assert.match(page, /<PosProductMockup/);
  assert.match(mockup, /Kasir/);
  assert.match(mockup, /Cari produk atau barcode/);
  assert.match(mockup, /Total pembayaran/);
  assert.match(mockup, /Selesaikan transaksi/);
  assert.match(page, /rounded-panel pt-12 sm:pt-16/);
  assert.match(page, /rounded-t-panel bg-white\/25 px-2 pt-2/);
  assert.match(page, /min-h-\[24rem\]/);
  assert.match(page, /h-\[15rem\]/);
  assert.match(page, /min-h-0 px-5 pb-6 pt-4/);
  assert.match(page, /landing-feature-visual-frame/);
  assert.match(page, /function FeatureCard/);
  assert.match(page, /row === "lead"/);
  assert.match(page, /row === "supporting"/);
  assert.match(page, /landing-feature-mockup-frame/);
  assert.match(page, /landing-feature-mockup-surface/);
  assert.match(page, /<PosProductMockup compact \/>/);
  assert.match(page, /feature\.size === "wide" \? "lg:col-span-8" : "lg:col-span-4"/);
  assert.match(page, /grid-rows-\[22rem_auto\]/);
  assert.match(page, /feature\.row === "lead" \? "grid-rows-\[22rem_auto\]"/);
  assert.match(page, /feature\.row === "lead" \? "h-\[22rem\]"/);
  assert.match(page, /grid min-h-0 grid-rows-5/);
  assert.doesNotMatch(page, /grid h-full grid-rows-\[minmax\(12rem,1fr\)_auto\]/);
  assert.match(mockup, /cropBottom = false/);
  assert.match(mockup, /landing-hero-mockup/);
  assert.match(mockup, /visibleProducts = products\.slice\(0, 4\)/);
  assert.match(mockup, /compact \? "" : "flex-wrap"/);
  assert.match(mockup, /h-\[360px\] sm:h-\[470px\] lg:h-\[520px\]/);
  assert.match(mockup, /!compact && index > 1 \? "hidden sm:grid" : "grid"/);
});

test("compact POS feature mockup is a complete centered frame", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const mockup = await readFile(new URL("../landing/PosProductMockup.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../components/design/MarketingPatternsShowcase.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(page, /landing-feature-mockup-frame/);
  assert.match(mockup, /mx-auto grid h-full w-full max-w-\[34rem\] grid-rows-\[auto_minmax\(0,1fr\)\] rounded-card/);
  assert.match(mockup, /visibleProducts = products\.slice\(0, 4\)/);
  assert.match(mockup, /compact \? categories\.slice\(0, 3\) : categories/);
  assert.doesNotMatch(mockup, /compact \? "h-\[280px\]"/);
  assert.match(mockup, /compact \? "relative" : "absolute inset-x-0 bottom-0 lg:hidden"/);
  assert.match(mockup, /compact \? "hidden" : "hidden lg:flex"/);
  assert.match(mockup, /!compact && \(/);
  assert.match(mockup, /smooth-shadow-ring shadow-black smooth-ring-neutral-300\/30/);
  const featureCardStart = page.indexOf('className={`grid min-h-[24rem]');
  const featureCardClass = page.slice(featureCardStart, page.indexOf('`}', featureCardStart));
  assert.match(featureCardClass, /smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300\/30/);
  assert.doesNotMatch(featureCardClass, /border(?:-|\s)/);
  const featureFrameRuleStart = css.indexOf('.landing-feature-mockup-frame {');
  const featureFrameRule = css.slice(featureFrameRuleStart, css.indexOf("\n  }", featureFrameRuleStart));
  const featureSurfaceRuleStart = css.indexOf('.landing-feature-mockup-surface > [aria-hidden="true"]');
  const featureSurfaceRule = css.slice(featureSurfaceRuleStart, css.indexOf("\n  }", featureSurfaceRuleStart));
  assert.match(css, /\.landing-feature-mockup-frame[\s\S]*padding: 1rem;[\s\S]*background: transparent;/);
  assert.doesNotMatch(featureFrameRule, /border-radius:/);
  assert.match(css, /\.landing-feature-mockup-surface[\s\S]*background: var\(--color-surface\);[\s\S]*border: 1px solid var\(--color-border\);[\s\S]*border-radius: var\(--radius-panel\);/);
  assert.match(css, /\.landing-feature-mockup-surface[\s\S]*block-size: 100%;/);
  assert.match(mockup, /relative flex min-h-0/);
  assert.match(mockup, /min-h-0 min-w-0 flex-1 overflow-hidden bg-app-bg/);
  assert.match(featureSurfaceRule, /inline-size: 100%/);
  assert.doesNotMatch(featureSurfaceRule, /transform: scale/);
  assert.match(showcase, /grid min-h-48 place-items-center rounded-panel bg-surface p-4/);
  assert.match(showcase, /landing-feature-mockup-frame/);
  assert.match(showcase, /landing-feature-mockup-surface/);
  assert.match(design, /POS feature visual area stays white/);
  assert.match(design, /bounded grid and clip internal content/);
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
  assert.match(page, /scrollToSectionRespectingMotion/);
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

test("landing review fixes stay synchronized across production and showcase patterns", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const faq = await readFile(new URL("../landing/FaqSection.jsx", import.meta.url), "utf8");
  const pricing = await readFile(new URL("../landing/PricingSection.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../components/design/MarketingPatternsShowcase.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const design = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(page, /w-\[calc\(100%-2rem\)\] max-w-6xl[\s\S]*bg-surface\/88[\s\S]*sm:w-\[calc\(100%-3rem\)\]/);
  assert.doesNotMatch(page, /min-h-\[520px\]/);
  assert.match(faq, /text-balance/);
  assert.match(faq, /leading-\[1\.6\]/);
  assert.match(pricing, /hasContactChannel/);
  assert.match(pricing, /Kontak upgrade belum tersedia/);
  assert.match(pricing, /size-11/);
  assert.match(pricing, /text-balance/);
  assert.match(pricing, /leading-\[1\.6\]/);
  assert.doesNotMatch(pricing, /Kontak WhatsApp belum tersedia/);
  assert.doesNotMatch(pricing, /Kontak email belum tersedia/);
  assert.match(showcase, /contacts=\{\{ whatsapp:/);
  assert.match(css, /\.public-skip-link:focus-visible/);
  assert.match(design, /first keyboard stop on the landing page/);
});

test("public header and footer anchors share offset-aware motion behavior", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const motion = await readFile(new URL("../landing/motion.js", import.meta.url), "utf8");

  assert.match(page, /function handlePublicSectionNavigation/);
  assert.match(page, /onClick=\{\(event\) => handlePublicSectionNavigation\(event, item\.href\)\}/);
  assert.match(motion, /offset = 96/);
  assert.match(motion, /prefers-reduced-motion/);
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

test("below-the-fold sections reveal on scroll with a short stagger and a reduced-motion fallback", async () => {
  const page = await readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const reveal = await readFile(new URL("../landing/ScrollReveal.jsx", import.meta.url), "utf8");

  assert.match(reveal, /IntersectionObserver/);
  assert.match(reveal, /prefers-reduced-motion: reduce/);
  assert.match(reveal, /setVisible\(true\)/);
  assert.match(reveal, /is-visible/);
  assert.match(reveal, /"--reveal-delay"/);
  assert.match(page, /<ScrollReveal/);
  assert.match(page, /as="article"/);
  assert.match(page, /delay=\{index \* 60\}/);
  assert.match(page, /delay=\{240\}/);
  assert.match(css, /\.scroll-reveal \{/);
  assert.match(css, /\.scroll-reveal\.is-visible/);
  assert.match(css, /opacity 420ms var\(--ease-standard\)[\s\S]*transform 420ms var\(--ease-standard\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.scroll-reveal \{[\s\S]*opacity: 1/);
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

  assert.match(page, /hero-ascii-magic-6\.png/);
  assert.match(page, /<PosProductMockup cropBottom \/>/);
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
