import React from "react";
import { animate } from "motion";
import { useReducedMotion } from "motion/react";
import { toast } from "sonner";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { EmptyState } from "../components/feedback/EmptyState.jsx";
import BackgroundUpdateStatus from "../components/feedback/BackgroundUpdateStatus.jsx";
import { CartRow } from "../components/pos/CartRow.jsx";
import { CashPaymentFeedback } from "../components/pos/CashPaymentFeedback.jsx";
import QuotaStatus from "../components/entitlements/QuotaStatus.jsx";
import { MobileCheckoutPanel } from "../components/pos/MobileCheckoutPanel.jsx";
import { PaymentSummary } from "../components/pos/PaymentSummary.jsx";
import { ProductCatalog } from "../components/pos/ProductCatalog.jsx";
import {
  Badge,
  Button,
  Dialog,
  FloatingPopover,
  Icon,
  Input,
} from "../components/primitives.jsx";
import { RetailPosSkeleton } from "../components/page-loading.jsx";
import { calculateCartTotals } from "../pos/domain.js";
import { activeMasterOptions, resolveMasterName } from "../pos/master-data.js";
import { usePOSStore } from "../pos/store.jsx";
import { primeScanSuccessSound } from "../preferences/scan-feedback.js";
import { formatPrice } from "../shared.jsx";
import { upgradeContacts } from "../entitlements/contact-links.js";
import {
  cartSwipeVelocity,
  cashPaymentState,
  isCartFocusCandidate,
  resistedCartTranslation,
  shouldDismissCartSwipe,
} from "./retail-pos-utils.js";

const formatThousands = (value) => {
  if (!value) return value;
  return new Intl.NumberFormat("id-ID").format(Number(value));
};

const formatCartRowPrice = (value) => formatPrice(value).replace(/^Rp/, "");

const CART_EXIT_MS = 200;
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(container) {
  return container
    ? Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isCartFocusCandidate)
    : [];
}

function getCartTranslateX(element) {
  if (!element || typeof window === "undefined") return 0;
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === "none") return 0;

  if (typeof DOMMatrixReadOnly === "function") {
    try {
      return new DOMMatrixReadOnly(transform).m41;
    } catch {
      // Fall through to the matrix parser for older WebViews.
    }
  }

  const matrix3d = transform.match(/^matrix3d\((.+)\)$/);
  if (matrix3d) return Number(matrix3d[1].split(",")[12]) || 0;
  const matrix2d = transform.match(/^matrix\((.+)\)$/);
  return matrix2d ? Number(matrix2d[1].split(",")[4]) || 0 : 0;
}

export default function RetailPosPage() {
  const store = usePOSStore();
  const shouldReduceMotion = useReducedMotion();
  const retailPosRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  const categoryTabsRef = React.useRef(null);
  const categoryTabRefs = React.useRef(new Map());
  const cartTriggerRef = React.useRef(null);
  const cartCloseRef = React.useRef(null);
  const cartMenuTriggerRef = React.useRef(null);
  const cartMenuRef = React.useRef(null);
  const cartMenuItemRef = React.useRef(null);
  const cartPaneRef = React.useRef(null);
  const cartScrimRef = React.useRef(null);
  const cartReturnFocusRef = React.useRef(null);
  const cartCloseTimerRef = React.useRef(null);
  const cartAnimationRef = React.useRef(null);
  const cartAnimationTargetRef = React.useRef(null);
  const cartDragRef = React.useRef(null);
  const mobileCheckoutTriggerRef = React.useRef(null);
  const [categoryIndicator, setCategoryIndicator] = React.useState({ left: 0, width: 0, ready: false });
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [cashReceived, setCashReceived] = React.useState("");
  const [clearCartOpen, setClearCartOpen] = React.useState(false);
  const [cartMenuOpen, setCartMenuOpen] = React.useState(false);
  const [isPageLoading, setIsPageLoading] = React.useState(() => !(store.loaded.products && store.loaded.settings));
  const [checkoutPending, setCheckoutPending] = React.useState(false);
  const [cashError, setCashError] = React.useState("");
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [isCompactCart, setIsCompactCart] = React.useState(false);
  const [cartExpanded, setCartExpanded] = React.useState(false);
  const [cartPresent, setCartPresent] = React.useState(false);
  const [mobileCheckoutExpanded, setMobileCheckoutExpanded] = React.useState(false);
  const categoryTabs = React.useMemo(
    () => [{ value: "", label: "Semua" }, ...activeMasterOptions(store.categories)],
    [store.categories],
  );

  const totals = calculateCartTotals(store.cart, store.settings);
  const cartProducts = React.useMemo(
    () => new Map(store.products.map((product) => [product.id, product])),
    [store.products],
  );
  const isInitialLoad = isPageLoading;
  const isUpdatingPOS = (store.loading.products || store.loading.settings) && store.loaded.products && store.loaded.settings;
  const cashState = cashPaymentState(cashReceived, totals.total, store.cart.length);
  const planBlocksCheckout = store.entitlement?.canCheckout === false;
  const mobilePanelDisabled = store.cart.length === 0 || checkoutPending;
  const checkoutDisabled = mobilePanelDisabled || planBlocksCheckout;
  const upgradeContactLinks = React.useMemo(() => upgradeContacts({
    whatsapp: import.meta.env.VITE_UPGRADE_WHATSAPP_NUMBER,
    email: import.meta.env.VITE_UPGRADE_EMAIL,
    storeName: store.settings.storeName,
    supportReference: store.entitlement?.supportReference,
  }), [store.entitlement?.supportReference, store.settings.storeName]);
  const totalCartItems = store.cart.reduce((sum, item) => sum + item.qty, 0);
  const cashFeedback = cashState.showChange
    ? { status: "change", value: formatPrice(cashState.change) }
    : cashState.showShortfall
      ? { status: "shortfall", value: formatPrice(cashState.shortfall) }
      : null;
  const visibleCashError = paymentMethod === "cash"
    ? cashState.showShortfall
      ? ""
      : cashError || (cashReceived.trim() && !cashState.valid ? cashState.error : "")
    : "";

  const checkout = async () => {
    if (checkoutPending) return;
    if (paymentMethod === "cash" && !cashState.valid) {
      setCashError(cashState.error);
      return;
    }
    setCashError("");
    setCheckoutPending(true);
    try {
      const result = await store.checkout({
        method: paymentMethod,
        cashReceived: paymentMethod === "cash" ? cashState.amount : 0,
      });
      if (result.ok) {
        setCashReceived("");
        setMobileCheckoutExpanded(false);
        toast.success("Transaksi selesai", { description: result.transaction?.number });
      } else {
        toast.error(result.error || "Checkout gagal");
      }
    } finally {
      setCheckoutPending(false);
    }
  };

  const recordEntitlementContact = React.useCallback((event) => {
    store.api.recordEntitlementEvent(event).catch(() => {});
  }, [store.api]);

  const clearFilters = React.useCallback(() => {
    setQuery("");
    setCategory("");
    searchInputRef.current?.focus();
  }, []);

  const changePaymentMethod = (method) => {
    setPaymentMethod(method);
    setCashError("");
  };

  const clearCart = () => {
    if (store.cart.length === 0) return;
    store.clearCart();
    setMobileCheckoutExpanded(false);
    setCartMenuOpen(false);
    setClearCartOpen(false);
    toast.success("Keranjang dikosongkan");
  };

  const requestClearCart = () => {
    setCartMenuOpen(false);
    cartMenuTriggerRef.current?.focus({ preventScroll: true });
    setClearCartOpen(true);
  };

  const resetCartDragStyles = React.useCallback(() => {
    cartPaneRef.current?.style.removeProperty("transition");
    cartPaneRef.current?.style.removeProperty("transform");
    cartScrimRef.current?.style.removeProperty("opacity");
  }, []);

  const stopCartAnimation = React.useCallback(() => {
    cartAnimationRef.current?.stop();
    cartAnimationRef.current = null;
    cartAnimationTargetRef.current = null;
  }, []);

  const applyCartTranslation = React.useCallback((translation, width) => {
    const pane = cartPaneRef.current;
    if (!pane) return;
    const dimension = Math.max(Number(width) || pane.getBoundingClientRect().width || 1, 1);
    pane.style.transition = "none";
    pane.style.transform = `translate3d(${translation}px, 0, 0)`;
    if (cartScrimRef.current) {
      cartScrimRef.current.style.opacity = String(
        Math.max(0, Math.min(1, 1 - translation / dimension)),
      );
    }
  }, []);

  const finishCartClose = React.useCallback(() => {
    window.clearTimeout(cartCloseTimerRef.current);
    resetCartDragStyles();
    setCartExpanded(false);
    setCartPresent(false);
    cartReturnFocusRef.current?.focus?.({ preventScroll: true });
    cartReturnFocusRef.current = null;
  }, [resetCartDragStyles]);

  const settleCart = React.useCallback(({
    open,
    velocity = 0,
    from,
  }) => {
    const pane = cartPaneRef.current;
    if (!pane) return;
    const width = Math.max(pane.getBoundingClientRect().width, 1);
    const currentX = Number.isFinite(from) ? from : getCartTranslateX(pane);
    const targetX = open ? 0 : width;

    stopCartAnimation();
    cartAnimationTargetRef.current = open;
    if (open) setCartExpanded(true);
    cartAnimationRef.current = animate(currentX, targetX, {
      type: "spring",
      stiffness: 340,
      damping: 34,
      mass: 0.86,
      velocity,
      onUpdate: (latest) => applyCartTranslation(latest, width),
      onComplete: () => {
        cartAnimationRef.current = null;
        cartAnimationTargetRef.current = null;
        resetCartDragStyles();
        if (open) {
          setCartExpanded(true);
        } else {
          finishCartClose();
        }
      },
    });
  }, [applyCartTranslation, finishCartClose, resetCartDragStyles, stopCartAnimation]);

  const closeCart = React.useCallback(() => {
    setMobileCheckoutExpanded(false);
    setCartMenuOpen(false);
    window.clearTimeout(cartCloseTimerRef.current);
    if (shouldReduceMotion) {
      stopCartAnimation();
      setCartExpanded(false);
      cartCloseTimerRef.current = window.setTimeout(finishCartClose, CART_EXIT_MS);
      return;
    }
    settleCart({ open: false });
  }, [finishCartClose, settleCart, shouldReduceMotion, stopCartAnimation]);

  const openCart = React.useCallback(() => {
    window.clearTimeout(cartCloseTimerRef.current);
    stopCartAnimation();
    resetCartDragStyles();
    setMobileCheckoutExpanded(false);
    cartReturnFocusRef.current = document.activeElement;
    setCartPresent(true);
    setCartExpanded(true);
    window.requestAnimationFrame(() => {
      const pane = cartPaneRef.current;
      if (!shouldReduceMotion && pane) {
        const width = Math.max(pane.getBoundingClientRect().width, 1);
        applyCartTranslation(width, width);
        settleCart({ open: true, from: width });
      }
      cartCloseRef.current?.focus({ preventScroll: true });
    });
  }, [
    applyCartTranslation,
    resetCartDragStyles,
    settleCart,
    shouldReduceMotion,
    stopCartAnimation,
  ]);

  const handleCartPointerDown = React.useCallback((event) => {
    if (shouldReduceMotion) return;
    const pane = cartPaneRef.current;
    if (!isCompactCart || !cartPresent || !pane || cartDragRef.current || event.target.closest("button")) return;
    if (window.getComputedStyle(pane).position !== "absolute") return;
    const bounds = pane.getBoundingClientRect();
    const targetOpen = cartAnimationTargetRef.current ?? cartExpanded;
    const currentX = getCartTranslateX(pane);
    stopCartAnimation();
    event.currentTarget.setPointerCapture(event.pointerId);
    applyCartTranslation(currentX, bounds.width);
    cartDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTranslation: currentX,
      translation: currentX,
      targetOpen,
      committed: false,
      moved: false,
      samples: [{ x: event.clientX, time: event.timeStamp }],
      width: bounds.width,
    };
  }, [
    applyCartTranslation,
    cartExpanded,
    cartPresent,
    isCompactCart,
    shouldReduceMotion,
    stopCartAnimation,
  ]);

  const handleCartPointerMove = React.useCallback((event) => {
    const drag = cartDragRef.current;
    const pane = cartPaneRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !pane) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.committed) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        cartDragRef.current = null;
        settleCart({ open: drag.targetOpen, from: drag.translation });
        return;
      }
      drag.committed = true;
    }

    drag.moved = true;
    drag.samples.push({ x: event.clientX, time: event.timeStamp });
    if (drag.samples.length > 8) drag.samples.shift();
    drag.translation = resistedCartTranslation(
      drag.startTranslation + deltaX,
      drag.width,
    );
    applyCartTranslation(drag.translation, drag.width);
  }, [applyCartTranslation, settleCart]);

  const releaseCartPointer = React.useCallback((event, cancelled = false) => {
    const drag = cartDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cartDragRef.current = null;
    const samples = [
      ...drag.samples,
      { x: event.clientX, time: event.timeStamp },
    ];
    const velocity = cartSwipeVelocity(samples);
    const dismiss = shouldDismissCartSwipe({
      distance: drag.translation,
      velocity: velocity / 1000,
      width: drag.width,
    });
    const open = cancelled || !drag.moved ? drag.targetOpen : !dismiss;
    settleCart({
      open,
      velocity,
      from: drag.translation,
    });
  }, [settleCart]);

  const updateCategoryIndicator = React.useCallback(() => {
    const activeTab = categoryTabRefs.current.get(category);
    if (!activeTab) return;
    setCategoryIndicator((current) => {
      const next = { left: activeTab.offsetLeft, width: activeTab.offsetWidth, ready: true };
      return current.left === next.left && current.width === next.width && current.ready
        ? current
        : next;
    });
  }, [category]);

  React.useLayoutEffect(() => {
    if (isInitialLoad) return undefined;
    const node = retailPosRef.current;
    if (!node) return undefined;

    const updateCartMode = () => {
      setIsCompactCart(node.getBoundingClientRect().width <= 639);
    };
    updateCartMode();

    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateCartMode);
    observer?.observe(node);
    window.addEventListener("resize", updateCartMode);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateCartMode);
    };
  }, [isInitialLoad]);

  React.useLayoutEffect(() => {
    if (!isCompactCart) {
      window.clearTimeout(cartCloseTimerRef.current);
      cartDragRef.current = null;
      stopCartAnimation();
      resetCartDragStyles();
      setMobileCheckoutExpanded(false);
      setCartExpanded(false);
      setCartPresent(false);
      cartReturnFocusRef.current = null;
    }
  }, [isCompactCart, resetCartDragStyles, stopCartAnimation]);

  React.useLayoutEffect(() => {
    if (isInitialLoad) return undefined;
    const tabs = categoryTabsRef.current;
    const activeTab = categoryTabRefs.current.get(category);
    if (!tabs || !activeTab) return undefined;

    activeTab.scrollIntoView({ block: "nearest", inline: "nearest" });
    updateCategoryIndicator();

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateCategoryIndicator);
    observer?.observe(tabs);
    observer?.observe(activeTab);
    window.addEventListener("resize", updateCategoryIndicator);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateCategoryIndicator);
    };
  }, [category, categoryTabs.length, isInitialLoad, updateCategoryIndicator]);

  React.useEffect(() => {
    const focusSearch = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  React.useEffect(() => {
    if (!cartMenuOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      cartMenuItemRef.current?.focus({ preventScroll: true });
    });
    const closeOnOutsidePress = (event) => {
      if (
        !cartMenuTriggerRef.current?.contains(event.target) &&
        !cartMenuRef.current?.contains(event.target)
      ) {
        setCartMenuOpen(false);
      }
    };
    const handleMenuKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (cartMenuOpen) {
        setCartMenuOpen(false);
        cartMenuTriggerRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", handleMenuKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", handleMenuKeyDown);
    };
  }, [cartMenuOpen]);

  React.useEffect(() => {
    if (store.cart.length === 0) setCartMenuOpen(false);
  }, [store.cart.length]);

  React.useEffect(() => {
    if (!(isCompactCart && cartExpanded)) return undefined;
    const handleCartKeyDown = (event) => {
      if (clearCartOpen) return;
      if (cartMenuOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (mobileCheckoutExpanded) {
          setMobileCheckoutExpanded(false);
          window.requestAnimationFrame(() => mobileCheckoutTriggerRef.current?.focus({ preventScroll: true }));
          return;
        }
        closeCart();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusableElements(cartPaneRef.current);
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleCartKeyDown);
    return () => window.removeEventListener("keydown", handleCartKeyDown);
  }, [
    cartExpanded,
    cartMenuOpen,
    clearCartOpen,
    closeCart,
    isCompactCart,
    mobileCheckoutExpanded,
  ]);

  React.useEffect(() => () => {
    window.clearTimeout(cartCloseTimerRef.current);
    cartAnimationRef.current?.stop();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    if (!(store.loaded.products && store.loaded.settings)) setIsPageLoading(true);
    Promise.all([
      store.loadProducts({ force: true, signal: controller.signal }),
      store.loadSettings({ force: true, signal: controller.signal }),
      store.loadCategories({ force: true, signal: controller.signal }),
      store.loadUnits({ force: true, signal: controller.signal }),
    ]).finally(() => {
      if (!controller.signal.aborted) setIsPageLoading(false);
    });
    return () => controller.abort();
  }, [store.loadCategories, store.loadProducts, store.loadSettings, store.loadUnits]);

  React.useEffect(() => {
    if (!scannerOpen) return undefined;
    const controller = new AbortController();
    store.loadProducts({ signal: controller.signal });
    return () => controller.abort();
  }, [scannerOpen, store.loadProducts]);

  if (isInitialLoad) {
    return <RetailPosSkeleton />;
  }

  return (
    <div ref={retailPosRef} className="retail-pos-query h-full min-h-0">
      <div className="retail-pos-workspace grid h-full min-h-0 bg-app-bg">
        <main inert={isCompactCart && cartPresent ? true : undefined} className="retail-pos-catalog-pane flex min-w-0 flex-col border-border bg-surface">
        <div className="bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-base font-semibold text-text">Kasir</h1>
              <BackgroundUpdateStatus active={isUpdatingPOS} label="Memperbarui katalog kasir" />
              <button
                ref={cartTriggerRef}
                type="button"
                aria-label={`Buka keranjang, ${totalCartItems} item`}
                aria-expanded={cartExpanded}
                aria-controls="retail-pos-cart"
                onClick={openCart}
                className="retail-pos-cart-open pos-touch-target ml-auto min-w-11 items-center gap-2 rounded-control border border-border px-3 text-sm font-semibold text-text transition-colors duration-fast hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Icon name="cart" className="size-4" />
                <span>{totalCartItems}</span>
              </button>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:max-w-[620px]">
              <label className="pos-touch-target flex min-w-0 flex-1 items-center">
                <span className="pos-toolbar-control-surface flex h-9 w-full min-w-0 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus/30">
                  <Icon name="search" className="size-4 text-text-muted" />
                  <input
                    ref={searchInputRef}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
                    name="productSearch"
                    autoComplete="off"
                    aria-label="Cari produk atau barcode"
                    aria-keyshortcuts="Meta+K Control+K"
                    placeholder="Cari produk atau barcode…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <kbd className="hidden rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-semibold text-text-subtle sm:block">
                    ⌘ K / Ctrl K
                  </kbd>
                </span>
              </label>
              <Button
                type="button"
                variant="primary"
                size="base"
                compactVisual
                className="header-compact-action pos-toolbar-scan pos-touch-target shrink-0"
                onClick={() => {
                  void primeScanSuccessSound();
                  setScannerOpen(true);
                }}
              >
                <Icon name="scan" className="size-4" />
                Pindai barcode
              </Button>
            </div>
          </div>

          <div className="px-3 pb-2 pt-4 sm:px-6">
            <div
              ref={categoryTabsRef}
              className="category-tabs relative flex w-full min-w-0 gap-1 overflow-x-auto rounded-control border border-border bg-surface-muted p-1"
              aria-label="Kategori produk"
            >
              <span
                aria-hidden="true"
                className="category-tabs-indicator"
                style={{
                  "--category-indicator-x": `${categoryIndicator.left}px`,
                  "--category-indicator-width": `${categoryIndicator.width}px`,
                  opacity: categoryIndicator.ready ? 1 : 0,
                }}
              />
              {categoryTabs.map((entry) => {
                const item = entry.value;
                const label = entry.label;
                return (
                <button
                  ref={(node) => {
                    if (node) categoryTabRefs.current.set(item, node);
                    else categoryTabRefs.current.delete(item);
                  }}
                  key={item || "all"}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                  className={`pos-touch-target relative z-10 h-6 min-w-max flex-1 basis-0 rounded-md px-3 text-sm font-medium transition-colors duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    category === item
                      ? categoryIndicator.ready
                        ? "text-text"
                        : "bg-surface text-text shadow-low"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {label}
                </button>
                );
              })}
            </div>
          </div>
        </div>

        <ProductCatalog
          activeProducts={store.activeProducts}
          cart={store.cart}
          query={query}
          category={category}
          checkoutPending={checkoutPending}
          onAdd={store.addToCart}
          onClearFilters={clearFilters}
        />
        </main>

        <button
          ref={cartScrimRef}
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className={`retail-pos-cart-scrim ${cartPresent ? "is-present" : ""} ${cartExpanded ? "is-open" : ""}`}
          onClick={closeCart}
        />

        <aside
          ref={cartPaneRef}
          id="retail-pos-cart"
          role={isCompactCart && cartPresent ? "dialog" : undefined}
          aria-modal={isCompactCart && cartPresent ? "true" : undefined}
          aria-label="Keranjang belanja"
          className={`retail-pos-cart-pane flex min-w-0 flex-col border-border bg-surface ${cartExpanded ? "is-open" : ""}`}
          onTransitionEnd={(event) => {
            if (shouldReduceMotion && !cartExpanded && event.target === event.currentTarget) {
              finishCartClose();
            }
          }}
        >
        <>
          <div
            className="retail-pos-cart-drag-handle flex items-center justify-between gap-3 px-4 py-3"
            onPointerDown={handleCartPointerDown}
            onPointerMove={handleCartPointerMove}
            onPointerUp={(event) => releaseCartPointer(event)}
            onPointerCancel={(event) => releaseCartPointer(event, true)}
          >
            <div>
              <h2 className="text-base font-semibold text-text">Keranjang</h2>
              <p className="text-sm text-text-muted">{store.cart.length} jenis item</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="accent">{totalCartItems} item</Badge>
              <button
                ref={cartMenuTriggerRef}
                type="button"
                aria-label="Opsi keranjang"
                aria-haspopup="menu"
                aria-expanded={cartMenuOpen}
                aria-controls="retail-pos-cart-menu"
                onClick={() => setCartMenuOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setCartMenuOpen(true);
                  }
                }}
                disabled={store.cart.length === 0}
                className="pos-touch-target grid min-w-9 place-items-center rounded-control text-text-muted transition-colors duration-fast hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-35"
              >
                <Icon name="more" className="size-4" />
              </button>
              <FloatingPopover
                ref={cartMenuRef}
                anchorRef={cartMenuTriggerRef}
                open={cartMenuOpen}
                align="end"
                matchAnchorWidth={false}
                className="min-w-52 origin-top-right rounded-card border border-border bg-surface p-1 shadow-panel"
              >
                <div id="retail-pos-cart-menu" role="menu" aria-label="Opsi keranjang">
                  <button
                    ref={cartMenuItemRef}
                    type="button"
                    role="menuitem"
                    onClick={requestClearCart}
                    disabled={checkoutPending}
                    className="pos-touch-target flex w-full items-center gap-2 rounded-control px-3 text-left text-sm font-semibold text-danger transition-colors duration-fast hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-35"
                  >
                    <Icon name="trash" className="size-4" />
                    Kosongkan keranjang
                  </button>
                </div>
              </FloatingPopover>
              <button
                ref={cartCloseRef}
                type="button"
                onClick={closeCart}
                className="retail-pos-cart-toggle pos-touch-target rounded-control px-3 text-sm font-semibold text-text-muted transition-colors duration-fast hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Tutup
              </button>
            </div>
          </div>

          <div className="retail-pos-cart-content">
          <div className="retail-pos-cart-list px-4 py-3">
            {store.cart.length === 0 ? (
              <EmptyState
                icon={null}
                title="Keranjang masih kosong"
                description="Pindai atau tambahkan produk untuk mulai transaksi."
                className="p-7 shadow-[inset_0_2px_8px_rgb(0_0_0_/_0.06),0_1px_2px_rgb(0_0_0_/_0.04)]"
                borderClassName="border"
                titleClassName="text-sm"
                descriptionClassName="text-sm"
              />
            ) : (
              <div className="cart-item-list -mx-4">
                {store.cart.map((item) => {
                  const product = cartProducts.get(item.productId);
                  return (
                    <CartRow
                      key={item.productId}
                      item={{
                        ...item,
                        image: product?.image,
                      }}
                      subtotal={formatCartRowPrice(item.price * item.qty)}
                      unitPrice={`${formatCartRowPrice(item.price)} / ${resolveMasterName(store.units, product?.unitId, product?.unit || item.unit || "pcs")}`}
                      maxQty={product?.stock ?? item.stockAtAdd}
                      onUpdateQty={(qty) => store.updateCartQty(item.productId, qty)}
                      onRemove={() => store.updateCartQty(item.productId, 0)}
                      disabled={checkoutPending}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="retail-pos-cart-footer retail-pos-standard-checkout z-10 mt-auto gap-3 border-t border-border bg-surface px-4 py-3 shadow-[0_-10px_22px_-20px_rgb(29_29_31_/_0.32)]">
            <PaymentSummary
              subtotal={totals.subtotal}
              tax={totals.tax}
              discount={0}
              grandTotal={totals.total}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={changePaymentMethod}
              formatPrice={formatPrice}
              disabled={checkoutPending}
            />

            {paymentMethod === "cash" && (
              <Input
                label="Nominal tunai"
                placeholder="Contoh: 150.000…"
                error={visibleCashError}
                inputProps={{
                  name: "cashReceived",
                  autoComplete: "off",
                  value: cashReceived ? formatThousands(cashReceived) : cashReceived,
                  onChange: (event) => {
                    const raw = event.target.value.replace(/\D/g, "");
                    setCashReceived(raw);
                    setCashError("");
                  },
                  inputMode: "numeric",
                  disabled: checkoutPending,
                }}
              />
            )}
            <CashPaymentFeedback status={paymentMethod === "cash" ? cashFeedback?.status : null} value={cashFeedback?.value} />
            {paymentMethod === "qris" && (
              <div className="grid content-start gap-3 rounded-card border border-border bg-surface-muted p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">QRIS manual</span>
                  <span className="font-semibold text-text">{store.settings.qrisLabel}</span>
                </div>
                <p className="text-xs leading-5 text-text-muted">Konfirmasi pembayaran di aplikasi QRIS merchant sebelum menyelesaikan transaksi.</p>
              </div>
            )}

            <QuotaStatus
              entitlement={store.entitlement}
              error={store.entitlementError}
              loading={
                store.loading.entitlement ||
                (!store.loaded.entitlement && !store.entitlementError)
              }
              contacts={upgradeContactLinks}
              onRefresh={() => store.loadEntitlement({ force: true })}
              onContact={recordEntitlementContact}
            />
            <Button variant="primary" className="pos-touch-target" onClick={checkout} disabled={checkoutDisabled}>
              {planBlocksCheckout ? "Upgrade untuk melanjutkan" : checkoutPending ? "Menyelesaikan…" : "Selesaikan transaksi"}
            </Button>
          </div>

          <div className="retail-pos-mobile-checkout">
            <MobileCheckoutPanel
              expanded={mobileCheckoutExpanded}
              onExpand={() => setMobileCheckoutExpanded(true)}
              onCollapse={() => setMobileCheckoutExpanded(false)}
              grandTotal={formatPrice(totals.total)}
              disabled={mobilePanelDisabled}
              triggerRef={mobileCheckoutTriggerRef}
            >
              <div className="grid gap-3">
                <PaymentSummary
                  subtotal={totals.subtotal}
                  tax={totals.tax}
                  discount={0}
                  grandTotal={totals.total}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={changePaymentMethod}
                  formatPrice={formatPrice}
                  disabled={checkoutPending}
                  showTitle={false}
                />

                {paymentMethod === "cash" && (
                  <Input
                    label="Nominal tunai"
                    placeholder="Contoh: 150.000…"
                    error={visibleCashError}
                    inputProps={{
                      name: "mobileCashReceived",
                      autoComplete: "off",
                      value: cashReceived ? formatThousands(cashReceived) : cashReceived,
                      onChange: (event) => {
                        const raw = event.target.value.replace(/\D/g, "");
                        setCashReceived(raw);
                        setCashError("");
                      },
                      inputMode: "numeric",
                      disabled: checkoutPending,
                    }}
                  />
                )}
                <CashPaymentFeedback status={paymentMethod === "cash" ? cashFeedback?.status : null} value={cashFeedback?.value} />
                {paymentMethod === "qris" && (
                  <div className="grid content-start gap-3 rounded-card border border-border bg-surface-muted p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">QRIS manual</span>
                      <span className="font-semibold text-text">{store.settings.qrisLabel}</span>
                    </div>
                    <p className="text-xs leading-5 text-text-muted">Konfirmasi pembayaran di aplikasi QRIS merchant sebelum menyelesaikan transaksi.</p>
                  </div>
                )}

                <QuotaStatus
                  entitlement={store.entitlement}
                  error={store.entitlementError}
                  loading={
                    store.loading.entitlement ||
                    (!store.loaded.entitlement && !store.entitlementError)
                  }
                  contacts={upgradeContactLinks}
                  onRefresh={() => store.loadEntitlement({ force: true })}
                  onContact={recordEntitlementContact}
                />
                <Button variant="primary" className="pos-touch-target" onClick={checkout} disabled={checkoutDisabled}>
                  {planBlocksCheckout ? "Upgrade untuk melanjutkan" : checkoutPending ? "Menyelesaikan…" : "Selesaikan transaksi"}
                </Button>
              </div>
            </MobileCheckoutPanel>
          </div>
          </div>
        </>
        </aside>
      </div>
      <Dialog
        open={clearCartOpen}
        onClose={() => {
          if (!checkoutPending) setClearCartOpen(false);
        }}
        title="Kosongkan keranjang?"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button className="pos-touch-target" disabled={checkoutPending} onClick={() => setClearCartOpen(false)}>Tetap simpan</Button>
            <Button variant="danger" className="pos-touch-target" disabled={checkoutPending} onClick={clearCart}>Kosongkan</Button>
          </div>
        }
      >
        Semua item akan dihapus dari keranjang saat ini. Stok produk tidak akan berubah.
      </Dialog>
      <BarcodeScanner
        open={scannerOpen}
        title="Pindai barcode produk"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          const result = store.addToCart(code);
          if (result?.ok) {
            return {
              ok: true,
              message: "Produk ditambahkan dari barcode",
              description: code,
              product: {
                ...result.product,
                quantity: result.quantity,
              },
            };
          }
          store.clearNotice();
          return {
            ok: false,
            error: result?.error || "Barcode gagal dipindai",
            description: code,
          };
        }}
      />
    </div>
  );
}
