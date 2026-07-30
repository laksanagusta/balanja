import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("runtime POS components live outside showcase modules", async () => {
  const product = await readFile(new URL("./ProductCard.jsx", import.meta.url), "utf8");
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const payment = await readFile(new URL("./PaymentSummary.jsx", import.meta.url), "utf8");
  const mobileCheckout = await readFile(new URL("./MobileCheckoutPanel.jsx", import.meta.url), "utf8");
  const cashFeedback = await readFile(new URL("./CashPaymentFeedback.jsx", import.meta.url), "utf8");

  assert.match(product, /export function PosProductCard/);
  assert.match(cart, /export function CartRow/);
  assert.match(payment, /export function PaymentSummary/);
  assert.match(mobileCheckout, /export function MobileCheckoutPanel/);
  assert.match(cashFeedback, /export function CashPaymentFeedback/);
});

test("mobile checkout can remain inspectable when final submission is plan-blocked", async () => {
  const page = await readFile(new URL("../../pages/RetailPosPage.jsx", import.meta.url), "utf8");
  assert.match(page, /const mobilePanelDisabled = store\.cart\.length === 0 \|\| checkoutPending/);
  assert.match(page, /const checkoutDisabled = mobilePanelDisabled \|\| planBlocksCheckout/);
});

test("POS product card is an explicit variant", async () => {
  const source = await readFile(new URL("./ProductCard.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../design/MenuCardShowcase.jsx", import.meta.url), "utf8");

  assert.match(source, /export function PosProductCard/);
  assert.match(source, /const blocked = disabled \|\| outOfStock/);
  assert.match(source, /product-card-media-shell/);
  assert.match(source, /product-card-media/);
  assert.match(source, /product-card-content/);
  assert.match(source, /product-card-actions/);
  assert.match(source, /mediaAction=\{\(/);
  assert.match(source, /aria-label=\{outOfStock \? `\$\{product\.name\}: stok habis` : `Tambah \$\{product\.name\}`\}/);
  assert.match(source, /<span[\s\S]*className="product-add-button-surface"[\s\S]*aria-hidden="true"[\s\S]*>[\s\S]*<Icon name="plus" className="size-5" \/>/);
  assert.match(source, /showStockBadge=\{false\}/);
  assert.match(source, /priceOnly/);
  assert.doesNotMatch(source, /min-h-\[304px\]|product-card-actions mt-auto|border-t border-border/);
  assert.match(source, /priceOnly \? "gap-1 px-0 pb-0 pt-2\.5" : "gap-2 px-2 pb-0 pt-3"/);
  assert.match(source, /priceOnly\s+\? "overflow-visible rounded-none border-0 bg-transparent shadow-none"/);
  assert.match(source, /priceOnly\s+\? "aspect-square rounded-panel border-0"/);
  assert.match(source, /className="product-card-actions grid gap-2 px-2 pb-2 pt-2"/);
  assert.doesNotMatch(source, /PosProductCard[\s\S]*compactVisual/);
  assert.match(css, /\.pos-product-card\s*\{[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;[\s\S]*box-shadow:\s*none;/);
  assert.match(css, /\.pos-product-card \.product-card-media\s*\{[\s\S]*aspect-ratio:\s*1;[\s\S]*border-radius:\s*var\(--radius-panel\);/);
  assert.match(css, /\.pos-product-card \.product-card-name\s*\{[\s\S]*font-weight:\s*500;/);
  assert.match(css, /\.pos-product-card \.product-card-price\s*\{[\s\S]*font-weight:\s*750;[\s\S]*color:\s*var\(--color-text\);/);
  assert.match(css, /\.pos-product-card \.product-add-button\s*\{[\s\S]*position:\s*absolute;[\s\S]*inset-inline-end:\s*0\.5rem;[\s\S]*inset-block-end:\s*0\.5rem;[\s\S]*inline-size:\s*2\.75rem;[\s\S]*min-block-size:\s*2\.75rem;/);
  assert.match(css, /\.pos-product-card \.product-add-button \.product-add-button-surface\s*\{[\s\S]*inline-size:\s*2\.25rem;[\s\S]*block-size:\s*2\.25rem;[\s\S]*border:\s*1px solid var\(--color-border\);[\s\S]*border-radius:\s*999px;[\s\S]*background:\s*var\(--color-surface\);[\s\S]*box-shadow:\s*var\(--shadow-low\);[\s\S]*color:\s*var\(--color-text\);/);
  assert.match(css, /\.primary-button\s*\{[\s\S]*box-shadow:\s*none;[\s\S]*text-shadow:\s*none;/);
  assert.match(css, /\.primary-button::before,[\s\S]*\.primary-button::after\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /\.primary-button:active\s*\{[\s\S]*transform:\s*scale\(0\.97\)/);
  assert.match(source, /className=\{priceOnly \? "tabular-nums" : "font-mono tabular-nums"\}/);
  assert.match(showcase, /import \{ PosProductCard \}/);
  assert.match(showcase, /white circular plus control/);
  assert.doesNotMatch(source, /showStepper|allowRepeatAdd/);
});

test("POS catalog groups compact price and add action without repeating Rp", async () => {
  const catalog = await readFile(new URL("./ProductCatalog.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../design/POSPatterns.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");

  assert.match(catalog, /price:\s*formatPrice\(product\.price\)\.replace\(\/\^Rp\/,\s*""\)/);
  assert.match(showcase, /price:\s*"72\.000"/);
  assert.match(showcase, /foto tidak ditutupi badge stok/);
  assert.match(showcase, /aksi tambah berupa lingkaran putih berborder 36px dengan ikon plus di kanan bawah foto/);
  assert.match(showcase, /tanpa frame, border, atau shadow/);
  assert.match(design, /Product-card prices omit the repeated `Rp` prefix/);
  assert.match(design, /Every button follows one Uber-inspired flat system/);
  assert.match(design, /white circular plus control over the product photo/);
});

test("cart controls and payment choices stay visually compact with coarse-pointer targets", async () => {
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const product = await readFile(new URL("./ProductCard.jsx", import.meta.url), "utf8");
  const payment = await readFile(new URL("./PaymentSummary.jsx", import.meta.url), "utf8");

  assert.match(cart, /aria-label="Decrease quantity"/);
  assert.match(cart, /aria-label="Increase quantity"/);
  assert.match(cart, /aria-label="Kuantitas"/);
  assert.match(cart, /inputMode="numeric"/);
  assert.match(cart, /item\.qty === 1 \? 0 : item\.qty - 1/);
  assert.match(cart, /pos-compact-icon-target/);
  assert.match(cart, /handleQuantityInputChange/);
  assert.match(cart, /cart-qty-text-morph-a/);
  assert.match(cart, /cart-qty-input/);
  assert.match(product, /aria-label="Kurangi jumlah"/);
  assert.match(product, /aria-label="Tambah jumlah"/);
  assert.match(payment, /aria-pressed=\{paymentMethod === method\.id\}/);
  assert.match(cart, /pos-touch-target/);
  assert.match(cart, /cart-item-action-rail/);
  assert.match(cart, /items-center justify-between gap-3/);
  assert.match(product, /className="product-add-button pos-touch-target"/);
  assert.match(product, /<Button variant="primary" className="product-add-button pos-touch-target"/);
  assert.match(product, /priceOnly \? "gap-1 px-0 pb-0 pt-2\.5" : "gap-2 px-2 pb-0 pt-3"/);
  assert.match(payment, /className="pos-touch-target w-full justify-center gap-1\.5"/);
  assert.doesNotMatch(cart, /size-11|min-h-11|h-11/);
  assert.doesNotMatch(product, /product-add-button h-11/);
  assert.doesNotMatch(payment, /className="h-11 gap-1\.5"/);
});

test("cart and payment values adapt without overflowing narrow containers", async () => {
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const payment = await readFile(new URL("./PaymentSummary.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  assert.match(cart, /cart-item-identity-row/);
  assert.match(cart, /whitespace-nowrap/);
  assert.match(payment, /payment-summary-row/);
  assert.match(payment, /whitespace-nowrap/);
  assert.match(css, /container-name:\s*retail-pos-cart/);
  assert.match(css, /@container retail-pos-cart \(max-width:\s*360px\)/);
});

test("cart rows use the streamlined product hierarchy and compact Rupiah format", async () => {
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../../pages/RetailPosPage.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("../design/CartItemShowcase.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../../DESIGN.md", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  assert.match(cart, /size-12/);
  assert.match(cart, /line-clamp-2/);
  assert.match(cart, /cart-item-identity-row/);
  assert.match(cart, /cart-item-action-rail/);
  assert.doesNotMatch(cart, /item\.category|item\.barcode|item\.addons/);
  assert.match(cart, /tabular-nums text-text/);
  assert.doesNotMatch(cart, /font-mono text-sm font-semibold tabular-nums text-text/);
  assert.match(page, /const formatCartRowPrice = \(value\) => formatPrice\(value\)\.replace\(\/\^Rp\/, ""\);/);
  assert.match(page, /subtotal=\{formatCartRowPrice\(item\.price \* item\.qty\)\}/);
  assert.match(page, /unitPrice=\{`\$\{formatCartRowPrice\(item\.price\)\} \//);
  assert.match(showcase, /formatCartRowPrice/);
  assert.match(css, /\.cart-item-row \+ \.cart-item-row::before/);
  assert.match(design, /Row prices omit the repeated `Rp` prefix/);
});

test("product add feedback is announced without exposing decoration", async () => {
  const product = await readFile(new URL("./ProductCard.jsx", import.meta.url), "utf8");
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  assert.match(product, /role="status"/);
  assert.match(product, /aria-live="polite"/);
  assert.doesNotMatch(product, /setAddFeedback\(false\)[\s\S]*requestAnimationFrame/);
  assert.match(product, /data-visible=\{addFeedback\}/);
  assert.match(product, /import NumberFlow from "@number-flow\/react"/);
  assert.doesNotMatch(product, /className="number-ticker"/);
  assert.match(css, /\.product-add-feedback\s*\{[\s\S]*transition:[\s\S]*opacity[\s\S]*transform/);
  assert.doesNotMatch(css, /\.product-add-feedback\s*\{[^}]*animation:/);
  assert.match(css, /\.cart-qty-input\s*\{[\s\S]*animation-duration: var\(--duration-fast\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*\.cart-qty-input\s*\{[\s\S]*animation: none !important/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.product-card-frame:not\(\.is-out-of-stock\):hover/);
});

test("cart quantity and cash feedback use short directional motion without repeating on every digit", async () => {
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const feedback = await readFile(new URL("./CashPaymentFeedback.jsx", import.meta.url), "utf8");

  assert.match(cart, /previousQtyRef/);
  assert.match(cart, /document\.activeElement === input/);
  assert.match(cart, /prefers-reduced-motion: reduce/);
  assert.match(cart, /input\.animate/);
  assert.match(cart, /item\.qty > previousQty \? "55%" : "-55%"/);
  assert.match(cart, /duration: 160/);
  assert.match(feedback, /AnimatePresence initial=\{false\} mode="popLayout"/);
  assert.match(feedback, /key=\{status\}/);
  assert.match(feedback, /useReducedMotion/);
  assert.match(feedback, /blur\(2px\)/);
  assert.match(feedback, /duration: 0\.18/);
  assert.match(feedback, /duration: 0\.12/);
  assert.match(feedback, /aria-atomic="true"/);
});

test("product catalog defers filtering and contains off-screen cards", async () => {
  const catalog = await readFile(new URL("./ProductCatalog.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  assert.match(catalog, /React\.memo/);
  assert.match(catalog, /React\.useDeferredValue/);
  assert.match(catalog, /React\.useMemo/);
  assert.match(catalog, /const remainingStock = Math\.max\(Number\(product\.stock\) - qtyInCart, 0\)/);
  assert.match(catalog, /disabled=\{remainingStock <= 0 \|\| checkoutPending\}/);
  assert.match(catalog, /<PosProductCard/);
  assert.match(css, /\.pos-product-card[\s\S]*content-visibility:\s*auto/);
});
