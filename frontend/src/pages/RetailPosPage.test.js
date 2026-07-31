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
  const [source, filterDrawer] = await Promise.all([
    readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/pos/PosFilterDrawer.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(filterDrawer, /aria-label="Cari produk atau barcode"/);
  assert.match(filterDrawer, /aria-keyshortcuts="Meta\+K Control\+K"/);
  assert.match(filterDrawer, /focus-within:outline-1/);
  assert.doesNotMatch(filterDrawer, /focus-within:outline-2/);
  assert.match(source, /error=\{visibleCashError\}/);
  assert.match(source, /name:\s*"cashReceived"/);
  assert.match(filterDrawer, /aria-pressed=\{category === entry\.value\}/);
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

test("cashier loading skeleton mirrors visible search and category pills", async () => {
  const skeleton = await readFile(new URL("../components/page-loading.jsx", import.meta.url), "utf8");
  const section = skeleton.slice(
    skeleton.indexOf("export function RetailPosSkeleton"),
    skeleton.indexOf("export function DashboardPageSkeleton"),
  );

  assert.match(section, /grid flex-none gap-2 px-4 py-3/);
  assert.match(section, /h-11 w-full rounded-card/);
  assert.match(section, /h-8 shrink-0 rounded-full/);
  assert.match(section, /product-catalog-grid menu-grid-transition/);
  assert.match(section, /aspect-square w-full bg-surface-muted\/80/);
  assert.match(section, /rounded-panel bg-surface-muted/);
  assert.match(section, /absolute bottom-2 right-2 grid size-9 place-items-center rounded-full border border-border bg-surface shadow-low/);
  assert.match(section, /retail-pos-cart-drag-handle overlay-sticky-header/);
  assert.match(section, /mobile-checkout-panel z-10 mt-auto/);
  assert.doesNotMatch(section, /rounded-card border border-border bg-surface shadow-low/);
  assert.doesNotMatch(section, /min-h-\[118px\]/);
  assert.doesNotMatch(section, /retail-pos-cart-footer/);
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
  const scanIconAt = source.indexOf('<Icon name="scan"');
  const scanButtonAt = source.lastIndexOf("<button", scanIconAt);
  const scanButton = source.slice(scanButtonAt, scanIconAt + 40);
  assert.doesNotMatch(scanButton, /variant=|compactVisual|border/);
  assert.match(scanButton, /<Icon name="scan"/);
  assert.match(scanButton, /className="size-6"/);
  const scanControl = source.slice(scanButtonAt, source.indexOf("</button>", scanIconAt));
  assert.doesNotMatch(scanControl, />\s*Pindai barcode\s*</);
  assert.match(source, /createPortal/);
  assert.match(source, /app-top-bar-actions/);
  assert.doesNotMatch(source, /PosFilterDrawer/);
  assert.match(source, /name="productSearch"/);
  assert.match(source, /<ProductCategoryPills/);
  assert.doesNotMatch(source, /<h1 className="text-base font-semibold text-text">Kasir<\/h1>/);
  assert.doesNotMatch(source, /<h1/);
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
  assert.match(design, /smartphone-first shell/i);
  assert.match(design, /44px touch target/i);
  assert.match(design, /trap focus while open/i);
  assert.match(design, /rubber-band resistance/i);
  assert.match(design, /cross-fade the drawer/i);
  assert.match(design, /mark the workspace busy/i);
  assert.match(showcase, /PosProductCard/);
  assert.match(showcase, /Satu vertical scroller/);
  assert.match(showcase, /ikon, label Keranjang, dan jumlah item/i);
  assert.match(showcase, /tahanan rubber-band/i);
  assert.match(showcase, /tanpa kotak bidik permanen/i);
  assert.match(showcase, /nama produk, harga, jumlah terbaru di keranjang, dan barcode/i);
  assert.match(showcase, /cooldown pasti 1 detik/i);
  assert.match(showcase, /bunyi halus/i);
  assert.match(showcase, /MobileCheckoutPanel/);
  assert.match(design, /full viewport/i);
  assert.match(design, /continuity transition/i);
  assert.match(design, /live presentation transform/i);
  assert.match(design, /mounted `inert` descendants/i);
  assert.match(showcase, /posisi layar terkini/i);
  assert.match(showcase, /satu tekanan hanya menutup satu layer/i);
});

test("POS keeps one scroller and the overlay-cart model at every width", async () => {
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
  assert.doesNotMatch(css, /@container retail-pos \(min-width:\s*(?:640|960)px\)/);
  assert.doesNotMatch(css, /grid-template-columns:\s*minmax\(0,\s*1fr\) clamp/);
  assert.match(css, /@container pos-catalog/);
  assert.match(css, /\.product-catalog-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /@container pos-catalog \(min-width:\s*700px\)[\s\S]*repeat\(4,/);
});

test("category tabs keep a measured sliding indicator while horizontally overflowing", async () => {
  const source = await readFile(new URL("../components/pos/PosFilterDrawer.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /categoryTabsRef/);
  assert.match(source, /categoryTabRefs/);
  assert.match(source, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/);
  assert.match(source, /offsetLeft/);
  assert.match(source, /offsetWidth/);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /if \(!open\) return undefined;/);
  assert.match(source, /\[category, categories\.length, open, updateCategoryIndicator\]/);
  assert.match(source, /categoryIndicator\.ready[\s\S]*bg-surface text-text/);
  assert.doesNotMatch(source, /categoryIndicator\.ready[\s\S]{0,180}shadow-low/);
  assert.match(source, /category-tabs-indicator/);
  assert.match(source, /category-tabs[^"\n]*border border-border/);
  assert.match(css, /\.category-tabs-indicator[\s\S]*transition-property:\s*transform, width, opacity/);
  assert.match(css, /prefers-reduced-motion[\s\S]*\.category-tabs-indicator/);
});

test("cart is an accessible full-screen bottom drawer at every width", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /const \[cartExpanded, setCartExpanded\]/);
  assert.match(source, /ref=\{cartTriggerRef\}/);
  assert.match(source, /ref=\{cartCloseRef\}/);
  assert.match(source, /role=\{isCompactCart && cartPresent \? "dialog" : undefined\}/);
  assert.match(source, /aria-modal=\{isCompactCart && cartPresent \? "true" : undefined\}/);
  assert.match(source, /inert=\{isCompactCart && cartPresent \? true : undefined\}/);
  assert.match(source, /cartCloseRef\.current\?\.focus/);
  assert.match(source, /cartReturnFocusRef\.current\?\.focus/);
  assert.match(source, /focusableElements/);
  assert.match(source, /aria-controls="retail-pos-cart"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /retail-pos-cart-scrim/);
  assert.doesNotMatch(source, /cartExpanded && \(/);
  assert.match(source, /<Icon name="cart"/);
  assert.match(source, /aria-label="Kembali ke Kasir"/);
  assert.match(source, /name="chevron-left"/);
  assert.match(source, />Kasir<\/span>/);
  assert.doesNotMatch(source, />\s*Tutup\s*</);
  assert.match(source, /onPointerDown=\{handleCartPointerDown\}/);
  assert.match(source, /setPointerCapture/);
  assert.match(css, /\.retail-pos-cart-pane\s*\{[\s\S]*position:\s*fixed[\s\S]*inset:\s*0[\s\S]*width:\s*100%[\s\S]*height:\s*100svh[\s\S]*transform:\s*translate3d\(0,\s*100%,\s*0\)/);
  assert.match(css, /\.retail-pos-cart-pane\.is-open\s*\{[\s\S]*transform:\s*translate3d\(0,\s*0,\s*0\)/);
  assert.match(css, /\.retail-pos-cart-pane\s*\{[\s\S]*visibility:\s*hidden/);
  assert.match(css, /\.retail-pos-cart-list\s*\{[\s\S]*min-height:\s*0[\s\S]*flex:\s*1 1 0%[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.retail-pos-cart-scrim\s*\{[\s\S]*opacity:\s*0[\s\S]*transition:[\s\S]*opacity/);
  assert.match(css, /\.retail-pos-cart-scrim\.is-present[\s\S]*pointer-events:\s*auto/);
  assert.match(css, /prefers-reduced-motion[\s\S]*\.retail-pos-cart-pane[\s\S]*transform:\s*none[\s\S]*opacity/);
  assert.match(css, /\.retail-pos-cart-open\s*\{[\s\S]*display:\s*flex[\s\S]*inset-block-end:\s*calc\(var\(--app-bottom-navigation-clearance\) \+ 0\.75rem\)/);
  assert.doesNotMatch(css, /@container retail-pos \(min-width:\s*640px\)/);
  assert.match(css, /\.retail-pos-cart-drag-handle\s*\{[\s\S]*touch-action:\s*pan-x/);
  assert.doesNotMatch(source, /rounded-l-overlay/);
});

test("cart modal semantics remain enabled across the app canvas", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");

  assert.match(source, /const isCompactCart = true;/);
  assert.doesNotMatch(source, /retailPosRef|setIsCompactCart|updateCartMode/);
  assert.match(source, /inert=\{isCompactCart && cartPresent \? true : undefined\}/);
  assert.match(source, /role=\{isCompactCart && cartPresent \? "dialog" : undefined\}/);
  assert.doesNotMatch(source, /if \(!isCompactCart\)/);
});

test("cart focus and Escape handling respect nested inactive layers", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const utils = await readFile(new URL("./retail-pos-utils.js", import.meta.url), "utf8");

  assert.match(source, /filter\(isCartFocusCandidate\)/);
  assert.match(source, /if \(clearCartOpen\) return;/);
  assert.match(utils, /closest\(.{0,40}\[inert\]/s);
  assert.match(utils, /aria-hidden="true"/);
});

test("cart swipe settles with an interruptible velocity-aware spring", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");

  assert.match(source, /import \{ animate \} from "motion"/);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /cartAnimationRef\.current\?\.stop\(\)/);
  assert.match(source, /getCartTranslateY/);
  assert.match(source, /animate\(currentY, targetY,/);
  assert.match(source, /type:\s*"spring"/);
  assert.match(source, /velocity,/);
  assert.match(source, /cartSwipeVelocity/);
  assert.match(source, /if \(shouldReduceMotion\) return;/);
});

test("pending checkout keeps cart row controls mounted and disabled", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const row = await readFile(new URL("../components/pos/CartRow.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /onUpdateQty=\{checkoutPending \? undefined/);
  assert.doesNotMatch(source, /onRemove=\{checkoutPending \? undefined/);
  assert.match(source, /disabled=\{checkoutPending\}/);
  assert.match(row, /disabled = false/);
  assert.match(row, /disabled=\{disabled \|\| plusDisabled\}/);
  assert.match(row, /disabled=\{disabled\}/);
});

test("clear cart is a destructive header overflow action instead of a checkout peer", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const design = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");
  const showcase = await readFile(
    new URL("../components/design/POSPatterns.jsx", import.meta.url),
    "utf8",
  );
  const standardCheckout = source.slice(
    source.indexOf("retail-pos-standard-checkout"),
    source.indexOf("retail-pos-mobile-checkout"),
  );
  const mobileCheckout = source.slice(
    source.indexOf("retail-pos-mobile-checkout"),
    source.indexOf("</MobileCheckoutPanel>"),
  );

  assert.doesNotMatch(standardCheckout, /Kosongkan keranjang/);
  assert.doesNotMatch(mobileCheckout, /Kosongkan keranjang/);
  assert.equal(
    source.match(/setClearCartOpen\(true\)/g)?.length ?? 0,
    1,
  );
  assert.match(source, /aria-label="Opsi keranjang"/);
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitem"/);
  assert.match(source, /matchAnchorWidth=\{false\}/);
  assert.match(source, /align="end"/);
  assert.match(source, /text-danger/);
  assert.match(source, /disabled=\{checkoutPending\}/);
  assert.match(source, /if \(cartMenuOpen\)[\s\S]*setCartMenuOpen\(false\)/);
  assert.match(source, /if \(store\.cart\.length === 0\) setCartMenuOpen\(false\);/);
  assert.match(design, /header overflow menu/i);
  assert.match(showcase, /overflow menu header/i);
});

test("cart fills the viewport and progressively discloses checkout at every width", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const component = await readFile(new URL("../components/pos/MobileCheckoutPanel.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /const \[mobileCheckoutExpanded, setMobileCheckoutExpanded\]/);
  assert.match(source, /retail-pos-standard-checkout/);
  assert.match(source, /retail-pos-mobile-checkout/);
  assert.match(source, /<MobileCheckoutPanel/);
  assert.match(source, /if \(mobileCheckoutExpanded\)[\s\S]*setMobileCheckoutExpanded\(false\)[\s\S]*mobileCheckoutTriggerRef\.current\?\.focus/);
  assert.match(source, /filter\(isCartFocusCandidate\)/);
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
  assert.doesNotMatch(css, /\.mobile-checkout-trigger\.primary-button\s*\{[\s\S]*box-shadow:/);
  assert.match(css, /\.retail-pos-cart-pane\s*\{[\s\S]*width:\s*100%[\s\S]*height:\s*100svh/);
  assert.match(css, /\.retail-pos-standard-checkout\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /\.retail-pos-mobile-checkout\s*\{[\s\S]*display:\s*block/);
  assert.doesNotMatch(css, /@container retail-pos \(min-width:\s*640px\)/);
});

test("cashier controls keep compact visuals and expand only for coarse pointers", async () => {
  const source = await readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(source, /pos-touch-target/);
  assert.doesNotMatch(source, /className="h-11(?: shrink-0)?"/);
  assert.doesNotMatch(source, /pos-filter-trigger/);
  assert.match(source, /mobile-search-control flex h-11/);
  assert.match(source, /ProductCategoryPills/);
  assert.match(source, /pos-toolbar-scan[\s\S]*<Icon name="scan" className="size-6"/);
  assert.match(css, /\.pos-touch-target\s*\{[\s\S]*min-block-size:\s*2\.25rem/);
  assert.match(css, /\.pos-toolbar-control-surface,[\s\S]*block-size:\s*2\.25rem/);
  assert.doesNotMatch(css, /\.pos-toolbar-scan \.header-compact-action-surface\.primary-button\s*\{[\s\S]*box-shadow:/);
  assert.match(css, /@media \(pointer:\s*coarse\)[\s\S]*\.pos-touch-target[\s\S]*min-block-size:\s*2\.75rem/);
});

test("POS filters stay visible above the catalog while mobile cart floats above navigation", async () => {
  const [source, css, design, showcase] = await Promise.all([
    readFile(new URL("./RetailPosPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
    readFile(new URL("../components/design/POSPatterns.jsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(source, /PosFilterDrawer/);
  assert.match(source, /<header className="grid flex-none gap-2 px-4 py-3">/);
  assert.match(source, /name="productSearch"/);
  assert.match(source, /<ProductCategoryPills/);
  assert.match(source, /searchInputRef\.current\?\.focus\(\)/);
  assert.match(source, /searchInputRef\.current\?\.select\(\)/);
  assert.match(source, /<AnimatePresence initial=\{false\}>/);
  assert.match(source, /totalCartItems > 0 &&/);
  assert.match(source, /className="retail-pos-cart-open"/);
  assert.match(source, /initial=\{\{ scale: shouldReduceMotion \? 1 : 0\.72 \}\}/);
  assert.match(source, /exit=\{\{ scale: shouldReduceMotion \? 1 : 0\.72 \}\}/);
  assert.match(source, /duration: shouldReduceMotion \? 0\.14 : 0\.22/);
  assert.match(source, />\s*Keranjang\s*</);
  assert.match(css, /\.retail-pos-cart-open\s*\{[\s\S]*inset-block-end:\s*calc\(var\(--app-bottom-navigation-clearance\) \+ 0\.75rem\)[\s\S]*inset-inline-start:\s*50%/);
  assert.match(css, /\.product-catalog-grid\s*\{[\s\S]*padding:\s*0\.5rem 0\.5rem 5\.5rem/);
  assert.match(design, /no longer uses a product-filter drawer/i);
  assert.match(showcase, /tidak memakai drawer filter/i);
});
