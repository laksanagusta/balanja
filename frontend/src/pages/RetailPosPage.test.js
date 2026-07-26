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
  assert.match(source, /focus-within:outline-1/);
  assert.doesNotMatch(source, /focus-within:outline-2/);
  assert.match(source, /error=\{visibleCashError\}/);
  assert.match(source, /name:\s*"cashReceived"/);
  assert.match(source, /aria-pressed=\{category === item\}/);
  assert.match(source, /CashPaymentFeedback/);
  assert.match(source, /cashState\.showShortfall/);
});

test("status copy and background refresh follow the interface contract", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const cashFeedback = await readFile(new URL("../components/pos/CashPaymentFeedback.jsx", import.meta.url), "utf8");

  assert.match(source, /Menyelesaikan…/);
  assert.match(cashFeedback, /role="status"/);
  assert.match(source, /BackgroundUpdateStatus/);
  assert.doesNotMatch(source, /UpdatingBadge|animate-pulse.*Memperbarui/s);
  assert.doesNotMatch(source, /Cari produk atau barcode\.\.\.|Menyelesaikan\.\.\./);
});

test("trial quota blocks only final checkout and keeps upgrade recovery visible", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  assert.match(source, /QuotaStatus/);
  assert.match(source, /planBlocksCheckout/);
  assert.match(source, /Upgrade untuk melanjutkan/);
  assert.match(source, /VITE_UPGRADE_WHATSAPP_NUMBER/);
  assert.match(source, /recordEntitlementEvent/);
  assert.match(source, /disabled=\{mobilePanelDisabled\}/);
});

test("cart barcode scanning stays inside the visible cashier workspace", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");

  assert.match(source, /import BarcodeScanner/);
  assert.match(source, /Pindai barcode/);
  const scanLabelAt = source.indexOf("Pindai barcode");
  const scanButton = source.slice(source.lastIndexOf("<Button", scanLabelAt), scanLabelAt);
  assert.match(scanButton, /variant="primary"/);
  assert.match(scanButton, /<Icon name="scan"/);
  assert.match(source, /if \(!scannerOpen\) return/);
  assert.match(source, /store\.loadProducts\(\{ signal: controller\.signal \}\)/);
  assert.match(source, /<BarcodeScanner/);
  assert.match(source, /store\.addToCart\(code\)/);
  assert.match(source, /message:\s*"Produk ditambahkan dari barcode"/);
  assert.match(source, /product:\s*\{[\s\S]*\.\.\.result\.product,[\s\S]*quantity:\s*result\.quantity/);
  assert.match(source, /primeScanSuccessSound/);
  assert.match(source, /error:\s*result\?\.error \|\| "Barcode gagal dipindai"/);
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
  assert.match(design, /single vertical scroller/i);
  assert.match(design, /container quer/i);
  assert.match(design, /44px touch target/i);
  assert.match(design, /trap focus while open/i);
  assert.match(design, /rubber-band resistance/i);
  assert.match(design, /cross-fade the smartphone drawer/i);
  assert.match(design, /mark the workspace busy/i);
  assert.match(showcase, /PosProductCard/);
  assert.match(showcase, /Satu vertical scroller/);
  assert.match(showcase, /ikon cart dan jumlah item/i);
  assert.match(showcase, /tahanan rubber-band/i);
  assert.match(showcase, /tanpa kotak bidik permanen/i);
  assert.match(showcase, /nama produk, harga, jumlah terbaru di keranjang, dan barcode/i);
  assert.match(showcase, /cooldown pasti 1 detik/i);
  assert.match(showcase, /bunyi halus/i);
  assert.match(showcase, /MobileCheckoutPanel/);
  assert.match(design, /639px or less/i);
  assert.match(design, /continuity transition/i);
});

test("compact POS uses one scroller and switches layout from its container width", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const catalog = await readFile(
    new URL("../components/pos/ProductCatalog.jsx", import.meta.url),
    "utf8",
  );
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /retail-pos-query/);
  assert.match(source, /retail-pos-workspace/);
  assert.doesNotMatch(source, /min-h-\[640px\]|min-h-\[560px\]|xl:grid-cols/);
  assert.doesNotMatch(source, /retail-pos-workspace[^"\n]*overflow-y-auto/);
  assert.doesNotMatch(source, /retail-pos-cart-pane[^"\n]*border-t/);
  assert.doesNotMatch(source, /retail-pos-cart-footer[^"\n]*sticky/);
  assert.match(catalog, /product-catalog-grid/);
  assert.doesNotMatch(catalog, /sm:grid-cols|lg:grid-cols|2xl:grid-cols/);
  assert.doesNotMatch(catalog, /product-catalog-grid[^"\n]*(?:flex-none|overflow-visible)/);
  assert.match(css, /container-name:\s*retail-pos/);
  assert.match(css, /@container retail-pos \(min-width:\s*960px\)/);
  assert.match(css, /clamp\(360px,\s*30cqi,\s*420px\)/);
  assert.match(css, /@container pos-catalog/);
  assert.match(css, /\.product-catalog-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /@container pos-catalog \(min-width:\s*700px\)[\s\S]*repeat\(4,/);
});

test("category tabs keep a measured sliding indicator while horizontally overflowing", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /categoryTabsRef/);
  assert.match(source, /categoryTabRefs/);
  assert.match(source, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/);
  assert.match(source, /offsetLeft/);
  assert.match(source, /offsetWidth/);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /if \(isInitialLoad\) return undefined;/);
  assert.match(source, /\[category, categoryTabs\.length, isInitialLoad, updateCategoryIndicator\]/);
  assert.match(source, /categoryIndicator\.ready[\s\S]*bg-surface text-text shadow-low/);
  assert.match(source, /category-tabs-indicator/);
  assert.match(source, /category-tabs[^"\n]*border border-border/);
  assert.match(css, /\.category-tabs-indicator[\s\S]*transition-property:\s*transform, width, opacity/);
  assert.match(css, /prefers-reduced-motion[\s\S]*\.category-tabs-indicator/);
});

test("compact cart is an accessible horizontal drawer while desktop cart stays visible", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /const \[cartExpanded, setCartExpanded\]/);
  assert.match(source, /ref=\{cartTriggerRef\}/);
  assert.match(source, /ref=\{cartCloseRef\}/);
  assert.match(source, /role=\{cartPresent \? "dialog" : undefined\}/);
  assert.match(source, /aria-modal=\{cartPresent \? "true" : undefined\}/);
  assert.match(source, /inert=\{cartPresent \? true : undefined\}/);
  assert.match(source, /cartCloseRef\.current\?\.focus/);
  assert.match(source, /cartReturnFocusRef\.current\?\.focus/);
  assert.match(source, /focusableElements/);
  assert.match(source, /aria-controls="retail-pos-cart"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /retail-pos-cart-scrim/);
  assert.doesNotMatch(source, /cartExpanded && \(/);
  assert.match(source, /<Icon name="cart"/);
  assert.doesNotMatch(source, /retail-pos-cart-toggle[\s\S]{0,500}name="chevron"/);
  assert.match(source, />\s*Tutup\s*</);
  assert.match(source, /onPointerDown=\{handleCartPointerDown\}/);
  assert.match(source, /setPointerCapture/);
  assert.match(css, /\.retail-pos-cart-pane\s*\{[\s\S]*transform:\s*translate3d\(100%,\s*0,\s*0\)/);
  assert.match(css, /\.retail-pos-cart-pane\.is-open\s*\{[\s\S]*transform:\s*translate3d\(0,\s*0,\s*0\)/);
  assert.match(css, /\.retail-pos-cart-pane\s*\{[\s\S]*visibility:\s*hidden/);
  assert.match(css, /\.retail-pos-cart-list\s*\{[\s\S]*min-height:\s*0[\s\S]*flex:\s*1 1 0%[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.retail-pos-cart-scrim\s*\{[\s\S]*opacity:\s*0[\s\S]*transition:[\s\S]*opacity/);
  assert.match(css, /\.retail-pos-cart-scrim\.is-present[\s\S]*pointer-events:\s*auto/);
  assert.match(css, /prefers-reduced-motion[\s\S]*\.retail-pos-cart-pane[\s\S]*transform:\s*none[\s\S]*opacity/);
  assert.match(css, /prefers-reduced-motion[\s\S]*@container retail-pos \(min-width:\s*640px\)[\s\S]*\.retail-pos-cart-pane[\s\S]*opacity:\s*1/);
  assert.match(css, /\.retail-pos-cart-open\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /@container retail-pos \(max-width:\s*639px\)[\s\S]*\.retail-pos-cart-open[\s\S]*display:\s*flex/);
  assert.match(css, /@container retail-pos \(min-width:\s*640px\)[\s\S]*\.retail-pos-cart-pane[\s\S]*position:\s*static[\s\S]*visibility:\s*visible/);
});

test("smartphone cart is full width and progressively discloses checkout without changing larger layouts", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const component = await readFile(new URL("../components/pos/MobileCheckoutPanel.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /const \[mobileCheckoutExpanded, setMobileCheckoutExpanded\]/);
  assert.match(source, /retail-pos-standard-checkout/);
  assert.match(source, /retail-pos-mobile-checkout/);
  assert.match(source, /<MobileCheckoutPanel/);
  assert.match(source, /if \(mobileCheckoutExpanded\)[\s\S]*setMobileCheckoutExpanded\(false\)[\s\S]*mobileCheckoutTriggerRef\.current\?\.focus/);
  assert.match(source, /getClientRects\(\)\.length > 0/);
  assert.match(component, /from "motion\/react"/);
  assert.match(component, /AnimatePresence/);
  assert.doesNotMatch(component, /LayoutGroup|layout="size"|mode="popLayout"/);
  assert.match(component, /mode="sync"/);
  assert.match(component, /type: "spring"/);
  assert.match(component, /stiffness: 260/);
  assert.match(component, /damping: 30/);
  assert.match(component, /mass: 0\.82/);
  assert.match(component, /height: expanded \? "auto" : 0/);
  assert.match(component, /inert=\{!expanded\}/);
  assert.match(component, /size="md"/);
  assert.doesNotMatch(component, /size=\{expanded \? "sm" : "md"\}/);
  assert.match(component, /aria-expanded=\{expanded\}/);
  assert.match(component, /aria-controls=\{detailId\}/);
  assert.match(component, /headingRef\.current\?\.focus/);
  assert.match(css, /\.mobile-checkout-trigger\.primary-button[\s\S]*box-shadow:/);
  assert.match(css, /\.mobile-checkout-trigger\.primary-button::after[\s\S]*display:\s*none/);
  assert.match(css, /@container retail-pos \(max-width:\s*639px\)[\s\S]*\.retail-pos-cart-pane[\s\S]*width:\s*100%[\s\S]*border-left:\s*0/);
  assert.match(css, /@container retail-pos \(max-width:\s*639px\)[\s\S]*\.retail-pos-standard-checkout[\s\S]*display:\s*none/);
  assert.match(css, /@container retail-pos \(max-width:\s*639px\)[\s\S]*\.retail-pos-mobile-checkout[\s\S]*display:\s*block/);
  assert.match(css, /\.retail-pos-standard-checkout\s*\{[\s\S]*display:\s*grid/);
  assert.match(css, /@container retail-pos \(min-width:\s*640px\)[\s\S]*clamp\(320px,\s*38cqi,\s*360px\)/);
});

test("cashier controls keep compact visuals and expand only for coarse pointers", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /pos-touch-target/);
  assert.doesNotMatch(source, /className="h-11(?: shrink-0)?"/);
  assert.match(source, /pos-toolbar-control-surface/);
  assert.match(source, /pos-toolbar-scan[\s\S]*compactVisual|compactVisual[\s\S]*pos-toolbar-scan/);
  assert.match(css, /\.pos-touch-target\s*\{[\s\S]*min-block-size:\s*2\.25rem/);
  assert.match(css, /\.pos-toolbar-control-surface,[\s\S]*block-size:\s*2\.25rem/);
  assert.match(css, /\.pos-toolbar-scan \.header-compact-action-surface\.primary-button[\s\S]*box-shadow:/);
  assert.match(css, /\.pos-toolbar-scan \.header-compact-action-surface\.primary-button::after[\s\S]*display:\s*none/);
  assert.match(css, /@media \(pointer:\s*coarse\)[\s\S]*\.pos-touch-target[\s\S]*min-block-size:\s*2\.75rem/);
});
