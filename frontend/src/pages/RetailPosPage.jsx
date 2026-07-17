import React from "react";
import { toast } from "sonner";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { EmptyState } from "../components/feedback/EmptyState.jsx";
import { CartRow } from "../components/pos/CartRow.jsx";
import { PaymentSummary } from "../components/pos/PaymentSummary.jsx";
import { ProductCatalog } from "../components/pos/ProductCatalog.jsx";
import { Badge, Button, Dialog, Icon, Input } from "../components/primitives.jsx";
import { RetailPosSkeleton } from "../components/page-loading.jsx";
import { calculateCartTotals, retailCategories } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";
import { cashPaymentState } from "./retail-pos-utils.js";

export default function RetailPosPage() {
  const store = usePOSStore();
  const searchInputRef = React.useRef(null);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("Semua");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [cashReceived, setCashReceived] = React.useState("");
  const [clearCartOpen, setClearCartOpen] = React.useState(false);
  const [isPageLoading, setIsPageLoading] = React.useState(() => !(store.loaded.products && store.loaded.settings));
  const [checkoutPending, setCheckoutPending] = React.useState(false);
  const [cashError, setCashError] = React.useState("");
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const activeCategoryIndex = Math.max(0, retailCategories.indexOf(category));

  const totals = calculateCartTotals(store.cart, store.settings);
  const cartProducts = React.useMemo(
    () => new Map(store.products.map((product) => [product.id, product])),
    [store.products],
  );
  const isInitialLoad = isPageLoading;
  const isUpdatingPOS = (store.loading.products || store.loading.settings) && store.loaded.products && store.loaded.settings;
  const cashState = cashPaymentState(cashReceived, totals.total, store.cart.length);
  const checkoutDisabled = store.cart.length === 0 || checkoutPending;
  const visibleCashError = paymentMethod === "cash"
    ? cashError || (cashReceived.trim() && !cashState.valid ? cashState.error : "")
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
        toast.success("Transaksi selesai", { description: result.transaction?.number });
      } else {
        toast.error(result.error || "Checkout gagal");
      }
    } finally {
      setCheckoutPending(false);
    }
  };

  const clearFilters = React.useCallback(() => {
    setQuery("");
    setCategory("Semua");
    searchInputRef.current?.focus();
  }, []);

  const changePaymentMethod = (method) => {
    setPaymentMethod(method);
    setCashError("");
  };

  const clearCart = () => {
    if (store.cart.length === 0) return;
    store.clearCart();
    setClearCartOpen(false);
    toast.success("Keranjang dikosongkan");
  };

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
    const controller = new AbortController();
    if (!(store.loaded.products && store.loaded.settings)) setIsPageLoading(true);
    Promise.all([
      store.loadProducts({ force: true, signal: controller.signal }),
      store.loadSettings({ force: true, signal: controller.signal }),
    ]).finally(() => {
      if (!controller.signal.aborted) setIsPageLoading(false);
    });
    return () => controller.abort();
  }, [store.loadProducts, store.loadSettings]);

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
    <div className="grid h-full min-h-0 overflow-y-auto bg-app-bg xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-hidden">
      <main className="flex min-h-[640px] flex-col border-border bg-surface xl:min-h-0 xl:border-r">
        <div className="bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-text">Kasir</h1>
              {isUpdatingPOS && <UpdatingBadge />}
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:max-w-[620px]">
              <div className="flex h-9 min-w-0 flex-1 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft focus-within:border-border-strong focus-within:outline-2 focus-within:outline-focus/30">
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
              </div>
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => setScannerOpen(true)}>
                <Icon name="scan" className="size-4" />
                Pindai barcode
              </Button>
            </div>
          </div>

          <div className="px-6 py-3">
            <div
              className="category-tabs relative grid h-[38px] overflow-x-auto rounded-control bg-surface-muted p-[5px]"
              aria-label="Product category"
              style={{
                "--category-count": retailCategories.length,
                "--category-index": activeCategoryIndex,
              }}
            >
              <span className="category-tabs-indicator" aria-hidden="true" />
              {retailCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                  className={`relative z-10 h-7 shrink-0 rounded-md px-3 text-sm font-medium transition ${
                    category === item
                      ? "text-text"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ProductCatalog
          activeProducts={store.activeProducts}
          cart={store.cart}
          query={query}
          category={category}
          checkoutPending={checkoutPending}
          isUpdating={isUpdatingPOS}
          onAdd={store.addToCart}
          onClearFilters={clearFilters}
        />
      </main>

      <aside className="flex min-h-[560px] flex-col overflow-hidden border-t border-border bg-surface xl:min-h-0 xl:border-t-0">
        <>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-text">Keranjang</h2>
              <p className="text-sm text-text-muted">{store.cart.length} jenis item</p>
            </div>
            <Badge tone="accent">{store.cart.reduce((sum, item) => sum + item.qty, 0)} item</Badge>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
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
              <div className="-mx-4 divide-y divide-border">
                {store.cart.map((item) => {
                  const product = cartProducts.get(item.productId);
                  return (
                    <CartRow
                      key={item.productId}
                      item={{
                        ...item,
                        category: product?.category || item.barcode,
                        image: product?.image,
                      }}
                      subtotal={formatPrice(item.price * item.qty)}
                      unitPrice={`${formatPrice(item.price)} / ${product?.unit || item.unit || "pcs"}`}
                      maxQty={product?.stock ?? item.stockAtAdd}
                      onUpdateQty={checkoutPending ? undefined : (qty) => store.updateCartQty(item.productId, qty)}
                      onRemove={checkoutPending ? undefined : () => store.updateCartQty(item.productId, 0)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative z-10 mt-auto grid gap-3 border-t border-border bg-surface px-4 py-3 shadow-[0_-10px_22px_-20px_rgb(29_29_31_/_0.32)]">
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
                placeholder="Contoh: 150000…"
                error={visibleCashError}
                inputProps={{
                  name: "cashReceived",
                  autoComplete: "off",
                  value: cashReceived,
                  onChange: (event) => {
                    setCashReceived(event.target.value);
                    setCashError("");
                  },
                  inputMode: "numeric",
                  disabled: checkoutPending,
                }}
              />
            )}
            {paymentMethod === "cash" && cashState.showChange && (
              <p role="status" aria-live="polite" className="rounded-control bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                Kembalian: {formatPrice(cashState.change)}
              </p>
            )}
            {paymentMethod === "qris" && (
              <div className="grid content-start gap-3 rounded-card border border-border bg-surface-muted p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">QRIS manual</span>
                  <span className="font-semibold text-text">{store.settings.qrisLabel}</span>
                </div>
                <p className="text-xs leading-5 text-text-muted">Konfirmasi pembayaran di aplikasi QRIS merchant sebelum menyelesaikan transaksi.</p>
              </div>
            )}

            <Button variant="primary" onClick={checkout} disabled={checkoutDisabled}>
              {checkoutPending ? "Menyelesaikan…" : "Selesaikan transaksi"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setClearCartOpen(true)}
              disabled={store.cart.length === 0 || checkoutPending}
            >
              Kosongkan keranjang
            </Button>
          </div>
        </>
      </aside>
      <Dialog
        open={clearCartOpen}
        onClose={() => {
          if (!checkoutPending) setClearCartOpen(false);
        }}
        title="Kosongkan keranjang?"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button disabled={checkoutPending} onClick={() => setClearCartOpen(false)}>Tetap simpan</Button>
            <Button variant="danger" disabled={checkoutPending} onClick={clearCart}>Kosongkan</Button>
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
            toast.success("Produk ditambahkan dari barcode", { description: code });
            return;
          }
          store.clearNotice();
          toast.error(result?.error || "Barcode gagal dipindai", { description: code });
        }}
      />
    </div>
  );
}

function UpdatingBadge() {
  return (
    <span role="status" aria-live="polite" className="inline-flex h-7 items-center gap-2 rounded-control border border-border bg-surface-muted px-2.5 text-xs font-semibold text-text-muted">
      <span className="size-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
      Memperbarui
    </span>
  );
}
