import React from "react";
import { createPortal } from "react-dom";
import { animate } from "motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import { ProductCategoryPills } from "../components/product/ProductCategoryPills.jsx";
import {
  Button,
  Dialog,
  FloatingPopover,
  Icon,
  Input,
} from "../components/primitives.jsx";
import { RetailPosSkeleton } from "../components/page-loading.jsx";
import { calculateCartTotals, variantKey } from "../pos/domain.js";
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

function getCartTranslateY(element) {
  if (!element || typeof window === "undefined") return 0;
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === "none") return 0;

  if (typeof DOMMatrixReadOnly === "function") {
    try {
      return new DOMMatrixReadOnly(transform).m42;
    } catch {
      // Fall through to the matrix parser for older WebViews.
    }
  }

  const matrix3d = transform.match(/^matrix3d\((.+)\)$/);
  if (matrix3d) return Number(matrix3d[1].split(",")[13]) || 0;
  const matrix2d = transform.match(/^matrix\((.+)\)$/);
  return matrix2d ? Number(matrix2d[1].split(",")[5]) || 0 : 0;
}

export default function RetailPosPage() {
  const store = usePOSStore();
  const shouldReduceMotion = useReducedMotion();
  const searchInputRef = React.useRef(null);
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
  const [topBarActionsTarget, setTopBarActionsTarget] = React.useState(null);
  const isCompactCart = true;
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

  const applyCartTranslation = React.useCallback((translation, height) => {
    const pane = cartPaneRef.current;
    if (!pane) return;
    const dimension = Math.max(Number(height) || pane.getBoundingClientRect().height || 1, 1);
    pane.style.transition = "none";
    pane.style.transform = `translate3d(0, ${translation}px, 0)`;
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
    const height = Math.max(pane.getBoundingClientRect().height, 1);
    const currentY = Number.isFinite(from) ? from : getCartTranslateY(pane);
    const targetY = open ? 0 : height;

    stopCartAnimation();
    cartAnimationTargetRef.current = open;
    if (open) setCartExpanded(true);
    cartAnimationRef.current = animate(currentY, targetY, {
      type: "spring",
      stiffness: 340,
      damping: 34,
      mass: 0.86,
      velocity,
      onUpdate: (latest) => applyCartTranslation(latest, height),
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
        const height = Math.max(pane.getBoundingClientRect().height, 1);
        applyCartTranslation(height, height);
        settleCart({ open: true, from: height });
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
    const bounds = pane.getBoundingClientRect();
    const targetOpen = cartAnimationTargetRef.current ?? cartExpanded;
    const currentY = getCartTranslateY(pane);
    stopCartAnimation();
    event.currentTarget.setPointerCapture(event.pointerId);
    applyCartTranslation(currentY, bounds.height);
    cartDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTranslation: currentY,
      translation: currentY,
      targetOpen,
      committed: false,
      moved: false,
      samples: [{ y: event.clientY, time: event.timeStamp }],
      height: bounds.height,
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
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
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
    drag.samples.push({ y: event.clientY, time: event.timeStamp });
    if (drag.samples.length > 8) drag.samples.shift();
    drag.translation = resistedCartTranslation(
      drag.startTranslation + deltaY,
      drag.height,
    );
    applyCartTranslation(drag.translation, drag.height);
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
      { y: event.clientY, time: event.timeStamp },
    ];
    const velocity = cartSwipeVelocity(samples);
    const dismiss = shouldDismissCartSwipe({
      distance: drag.translation,
      velocity: velocity / 1000,
      dimension: drag.height,
    });
    const open = cancelled || !drag.moved ? drag.targetOpen : !dismiss;
    settleCart({
      open,
      velocity,
      from: drag.translation,
    });
  }, [settleCart]);

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

  React.useEffect(() => {
    setTopBarActionsTarget(document.getElementById("app-top-bar-actions"));
  }, []);

  const topBarActions = topBarActionsTarget
    ? createPortal(
      <>
        <BackgroundUpdateStatus active={isUpdatingPOS} label="Memperbarui katalog kasir" />
        <button
          type="button"
          aria-label="Pindai barcode"
          title="Pindai barcode"
          className="pos-toolbar-scan pos-touch-target grid size-11 shrink-0 place-items-center rounded-control bg-transparent text-text transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          onClick={() => {
            void primeScanSuccessSound();
            setScannerOpen(true);
          }}
        >
          <Icon name="scan" className="size-6" />
        </button>
      </>,
      topBarActionsTarget,
    )
    : null;

  if (isInitialLoad) {
    return (
      <>
        {topBarActions}
        <RetailPosSkeleton />
      </>
    );
  }

  return (
    <>
    {topBarActions}
    <div className="retail-pos-query h-full min-h-0">
      <div className="retail-pos-workspace grid h-full min-h-0 bg-app-bg">
        <main inert={isCompactCart && cartPresent ? true : undefined} className="retail-pos-catalog-pane flex min-w-0 flex-col border-border bg-surface">
        <header className="grid flex-none gap-2 px-4 py-3">
          <div className="mobile-search-control flex h-11 min-w-0 items-center gap-3 rounded-control border border-border bg-surface px-3.5 shadow-inner-soft focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus/30">
            <Icon name="search" className="size-4 shrink-0 text-text-muted" />
            <input
              ref={searchInputRef}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text outline-none placeholder:text-text-subtle"
              name="productSearch"
              autoComplete="off"
              aria-label="Cari produk atau barcode"
              aria-keyshortcuts="Meta+K Control+K"
              placeholder="Nama produk atau barcode…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={() => setQuery("")}
                className="grid size-8 shrink-0 place-items-center rounded-control text-text-muted transition-[transform,background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Icon name="x" className="size-4" />
              </button>
            )}
          </div>
          <ProductCategoryPills
            value={category}
            options={categoryTabs}
            onChange={setCategory}
            label="Filter kategori produk kasir"
          />
        </header>
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

        <AnimatePresence initial={false}>
          {totalCartItems > 0 && (
            <motion.div
              key="retail-pos-cart-trigger"
              className="retail-pos-cart-open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0.14 : 0.2,
                ease: [0.2, 0, 0, 1],
              }}
            >
              <motion.button
                ref={cartTriggerRef}
                type="button"
                aria-label={`Buka keranjang, ${totalCartItems} item`}
                aria-expanded={cartExpanded}
                aria-controls="retail-pos-cart"
                onClick={openCart}
                className="group pos-touch-target min-w-0 items-center justify-center bg-transparent px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                initial={{ scale: shouldReduceMotion ? 1 : 0.72 }}
                animate={{ scale: 1 }}
                exit={{ scale: shouldReduceMotion ? 1 : 0.72 }}
                transition={{
                  duration: shouldReduceMotion ? 0.14 : 0.22,
                  ease: [0.2, 0, 0, 1],
                }}
              >
                <span className="inline-flex h-13 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white transition-transform duration-fast ease-standard group-active:scale-[0.97] motion-reduce:group-active:scale-100">
                  <Icon name="cart" className="size-4" />
                  <span>Keranjang</span>
                  <span className="grid min-w-5 place-items-center rounded-full bg-white/16 px-1.5 text-xs tabular-nums">
                    {totalCartItems}
                  </span>
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          ref={cartScrimRef}
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className={`overlay-scrim retail-pos-cart-scrim ${cartPresent ? "is-present" : ""} ${cartExpanded ? "is-open" : ""}`}
          onClick={closeCart}
        />

        <aside
          ref={cartPaneRef}
          id="retail-pos-cart"
          role={isCompactCart && cartPresent ? "dialog" : undefined}
          aria-modal={isCompactCart && cartPresent ? "true" : undefined}
          aria-label="Keranjang belanja"
          className={`retail-pos-cart-pane flex min-w-0 flex-col bg-surface ${cartExpanded ? "is-open" : ""}`}
          onTransitionEnd={(event) => {
            if (shouldReduceMotion && !cartExpanded && event.target === event.currentTarget) {
              finishCartClose();
            }
          }}
        >
        <>
          <div
            className="retail-pos-cart-drag-handle overlay-sticky-header grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 pb-3"
            onPointerDown={handleCartPointerDown}
            onPointerMove={handleCartPointerMove}
            onPointerUp={(event) => releaseCartPointer(event)}
            onPointerCancel={(event) => releaseCartPointer(event, true)}
          >
            <button
              ref={cartCloseRef}
              type="button"
              aria-label="Kembali ke Kasir"
              onClick={closeCart}
              className="pos-touch-target -ml-2 inline-flex min-w-0 items-center justify-self-start rounded-button px-2 text-sm font-semibold text-accent transition-[transform,background-color] duration-fast ease-standard hover:bg-accent-soft active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Icon name="chevron-left" className="size-5" />
              <span>Kasir</span>
            </button>
            <div className="min-w-0 text-center">
              <h2 className="truncate text-base font-semibold text-text">Keranjang</h2>
            </div>
            <div className="flex min-w-0 items-center justify-self-end gap-1">
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
                className="pos-touch-target grid min-w-9 place-items-center rounded-button text-text-muted transition-colors duration-fast hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-35"
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
                    className="pos-touch-target flex w-full items-center gap-2 rounded-button px-3 text-left text-sm font-semibold text-danger transition-colors duration-fast hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-35"
                  >
                    <Icon name="trash" className="size-4" />
                    Kosongkan keranjang
                  </button>
                </div>
              </FloatingPopover>
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
                  const variant = item.variantId ? product?.variants?.find((v) => v.id === item.variantId) : null;
                  return (
                    <CartRow
                      key={variantKey(item.productId, item.variantId)}
                      item={{
                        ...item,
                        image: variant?.image || product?.image,
                      }}
                      subtotal={formatCartRowPrice(item.price * item.qty)}
                      unitPrice={`${formatCartRowPrice(item.price)} / ${resolveMasterName(store.units, product?.unitId, product?.unit || item.unit || "pcs")}`}
                      maxQty={variant?.stock ?? product?.stock ?? item.stockAtAdd}
                      onUpdateQty={(qty) => store.updateCartQty(item.productId, item.variantId, qty)}
                      onRemove={() => store.updateCartQty(item.productId, item.variantId, 0)}
                      disabled={checkoutPending}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="retail-pos-cart-footer retail-pos-standard-checkout z-10 mt-auto gap-3 bg-surface px-4 py-3 shadow-[0_-10px_22px_-20px_rgb(29_29_31_/_0.32)]">
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
            <Button variant="primary" className="pos-touch-target w-full" onClick={checkout} disabled={checkoutDisabled}>
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
                <Button variant="primary" className="pos-touch-target w-full" onClick={checkout} disabled={checkoutDisabled}>
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
    </>
  );
}
