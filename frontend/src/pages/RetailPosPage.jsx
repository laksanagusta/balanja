import React from "react";
import { useUser } from "@clerk/react";
import { toast } from "sonner";
import { CartRow } from "../components/pos/CartRow.jsx";
import { EmptyState } from "../components/feedback/EmptyState.jsx";
import { ProductCard } from "../components/pos/ProductCard.jsx";
import { PaymentSummary } from "../components/pos/PaymentSummary.jsx";
import { Badge, Button, Dialog, Icon, Input } from "../components/primitives.jsx";
import { RetailPosSkeleton } from "../components/page-loading.jsx";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { calculateCartTotals, retailCategories } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";

export default function RetailPosPage() {
  const { user } = useUser();
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
  const debouncedQuery = useDebouncedValue(query, 220);
  const activeCategoryIndex = Math.max(0, retailCategories.indexOf(category));

  const products = store.activeProducts.filter((product) => {
    const matchesCategory = category === "Semua" || product.category === category;
    const text = `${product.name} ${product.barcode}`.toLowerCase();
    return matchesCategory && text.includes(debouncedQuery.toLowerCase());
  });
  const totals = calculateCartTotals(store.cart, store.settings);
  const cartProducts = React.useMemo(
    () => new Map(store.products.map((product) => [product.id, product])),
    [store.products],
  );
  const cartQtyByProduct = React.useMemo(
    () => new Map(store.cart.map((item) => [item.productId, item.qty])),
    [store.cart],
  );
  const isInitialLoad = isPageLoading;
  const isUpdatingPOS = (store.loading.products || store.loading.settings) && store.loaded.products && store.loaded.settings;
  const cashValue = Number(cashReceived);
  const cashPaymentInvalid = paymentMethod === "cash" && store.cart.length > 0 && cashValue < totals.total;
  const checkoutDisabled = store.cart.length === 0 || checkoutPending || cashPaymentInvalid;
  const visibleCashError = cashError || (cashPaymentInvalid ? "Cash received must cover the grand total." : "");

  const checkout = async () => {
    if (checkoutPending) return;
    if (cashPaymentInvalid) {
      setCashError("Cash received must cover the grand total.");
      return;
    }
    setCashError("");
    setCheckoutPending(true);
    try {
      const result = await store.checkout(
        { method: paymentMethod, cashReceived: Number(cashReceived) },
        user?.fullName || user?.primaryEmailAddress?.emailAddress || "Cashier",
      );
      if (result.ok) {
        setCashReceived("");
        toast.success("Sale completed", { description: result.transaction?.number });
      } else {
        toast.error(result.error || "Checkout failed");
      }
    } finally {
      setCheckoutPending(false);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setCategory("Semua");
    searchInputRef.current?.focus();
  };

  const changePaymentMethod = (method) => {
    setPaymentMethod(method);
    setCashError("");
  };

  const clearCart = () => {
    if (store.cart.length === 0) return;
    store.clearCart();
    setClearCartOpen(false);
    toast.success("Cart cleared");
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

  if (isInitialLoad) {
    return <RetailPosSkeleton />;
  }

  return (
    <div className="grid h-full min-h-0 overflow-y-auto bg-app-bg xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-hidden">
      <main className="flex min-h-[640px] flex-col border-border bg-surface xl:min-h-0 xl:border-r">
        <div className="bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-text">Point of Sale</h1>
              {isUpdatingPOS && <UpdatingBadge />}
            </div>
            <div className="flex h-9 w-full min-w-0 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft lg:max-w-md">
              <Icon name="search" className="size-4 text-text-muted" />
              <input
                ref={searchInputRef}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
                placeholder="Search products or barcode..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd className="hidden rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-semibold text-text-subtle sm:block">
                Cmd K
              </kbd>
            </div>
          </div>

          <div className="px-6 py-3">
            <div
              className="category-tabs relative grid h-[38px] overflow-x-auto rounded-control bg-surface-muted p-[5px]"
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

        <div className={`menu-grid-transition grid flex-1 auto-rows-max gap-4 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${isUpdatingPOS ? "opacity-60 transition-opacity duration-base ease-standard" : "transition-opacity duration-base ease-standard"}`}>
          {products.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 2xl:col-span-4">
              <EmptyState
                icon={null}
                title="No products found"
                description="Clear the search or switch category to keep selling."
                className="min-h-[260px] p-7"
                borderClassName="border"
                titleClassName="text-sm"
                descriptionClassName="text-sm"
              />
              <div className="mt-3 flex justify-center">
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  price: formatPrice(product.price),
                  qty: cartQtyByProduct.get(product.id) || 0,
                }}
                actionLabel={cartQtyByProduct.has(product.id) ? "Add one more" : "Add to cart"}
                allowRepeatAdd
                showStepper={false}
                disabled={product.stock <= 0 || checkoutPending}
                onAdd={() => store.addToCart(product.id)}
              />
            ))
          )}
        </div>
      </main>

      <aside className="flex min-h-[560px] flex-col overflow-hidden border-t border-border bg-surface xl:min-h-0 xl:border-t-0">
        <>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-text">Cart</h2>
              <p className="text-sm text-text-muted">{store.cart.length} item types</p>
            </div>
            <Badge tone="accent">{store.cart.reduce((sum, item) => sum + item.qty, 0)} items</Badge>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {store.cart.length === 0 ? (
              <EmptyState
                icon={null}
                title="Cart is empty"
                description="Scan or add products to get started."
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
                label="Cash received"
                placeholder="150000"
                inputProps={{
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
            {visibleCashError && (
              <p className="rounded-control border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                {visibleCashError}
              </p>
            )}

            {paymentMethod === "cash" && Number(cashReceived) >= totals.total && (
              <p className="rounded-control bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                Change: {formatPrice(Number(cashReceived) - totals.total)}
              </p>
            )}
            {paymentMethod === "qris" && (
              <div className="grid content-start gap-3 rounded-card border border-border bg-surface-muted p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Manual QRIS</span>
                  <span className="font-semibold text-text">{store.settings.qrisLabel}</span>
                </div>
                <p className="text-xs leading-5 text-text-muted">Confirm the payment on the merchant QRIS app before completing sale.</p>
              </div>
            )}

            <Button variant="primary" onClick={checkout} disabled={checkoutDisabled}>
              {checkoutPending ? "Completing..." : "Complete sale"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setClearCartOpen(true)}
              disabled={store.cart.length === 0 || checkoutPending}
            >
              Clear cart
            </Button>
          </div>
        </>
      </aside>
      <Dialog
        open={clearCartOpen}
        onClose={() => {
          if (!checkoutPending) setClearCartOpen(false);
        }}
        title="Clear cart?"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button disabled={checkoutPending} onClick={() => setClearCartOpen(false)}>Keep cart</Button>
            <Button variant="danger" disabled={checkoutPending} onClick={clearCart}>Clear cart</Button>
          </div>
        }
      >
        This will remove all items from the current cart. The product stock will not change.
      </Dialog>
    </div>
  );
}

function UpdatingBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-control border border-border bg-surface-muted px-2.5 text-xs font-semibold text-text-muted">
      <span className="size-1.5 animate-pulse rounded-full bg-accent" />
      Updating
    </span>
  );
}
