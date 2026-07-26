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

  assert.match(source, /export function PosProductCard/);
  assert.match(source, /const blocked = disabled \|\| outOfStock/);
  assert.match(source, /const buttonLabel = outOfStock \? "Stok habis" : actionLabel/);
  assert.doesNotMatch(source, /showStepper|allowRepeatAdd/);
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
  assert.match(cart, /cart-item-summary-actions grid justify-items-end gap-2/);
  assert.match(cart, /flex flex-wrap items-center justify-end gap-2/);
  assert.match(product, /className="product-add-button pos-touch-target"/);
  assert.match(product, /<Button variant="primary" className="product-add-button pos-touch-target"/);
  assert.match(product, /className="grid gap-2 px-2 py-3"/);
  assert.match(payment, /className="pos-touch-target gap-1\.5"/);
  assert.doesNotMatch(cart, /size-11|min-h-11|h-11/);
  assert.doesNotMatch(product, /product-add-button h-11/);
  assert.doesNotMatch(payment, /className="h-11 gap-1\.5"/);
});

test("cart and payment values adapt without overflowing narrow containers", async () => {
  const cart = await readFile(new URL("./CartRow.jsx", import.meta.url), "utf8");
  const payment = await readFile(new URL("./PaymentSummary.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  assert.match(cart, /cart-item-heading-row/);
  assert.match(cart, /whitespace-nowrap/);
  assert.match(payment, /payment-summary-row/);
  assert.match(payment, /whitespace-nowrap/);
  assert.match(css, /container-name:\s*retail-pos-cart/);
  assert.match(css, /@container retail-pos-cart \(max-width:\s*360px\)/);
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
