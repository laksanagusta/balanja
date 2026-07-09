import React from "react";
import { useUser } from "@clerk/react";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { CartRow } from "../components/design/CartItemShowcase.jsx";
import { Badge, Button, Icon, Input } from "../components/primitives.jsx";
import { calculateCartTotals, retailCategories } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";

export default function RetailPosPage() {
  const { user } = useUser();
  const store = usePOSStore();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("Semua");
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [cashReceived, setCashReceived] = React.useState("");

  const products = store.activeProducts.filter((product) => {
    const matchesCategory = category === "Semua" || product.category === category;
    const text = `${product.name} ${product.barcode}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  });
  const totals = calculateCartTotals(store.cart, store.settings);
  const cartProducts = React.useMemo(
    () => new Map(store.products.map((product) => [product.id, product])),
    [store.products],
  );

  const checkout = () => {
    store.checkout(
      { method: paymentMethod, cashReceived: Number(cashReceived) },
      user?.fullName || user?.primaryEmailAddress?.emailAddress || "Cashier",
    );
    setCashReceived("");
  };

  return (
    <div className="grid h-full min-h-0 bg-app-bg xl:grid-cols-[minmax(0,1fr)_400px]">
      <main className="flex min-h-0 flex-col border-border bg-surface xl:border-r">
        <div className="grid gap-5 border-b border-border px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text">Point of Sale</h1>
              <p className="mt-1 text-sm text-text-muted">Scan, search, and checkout retail items.</p>
            </div>
            <div className="flex w-full max-w-xl gap-2">
              <div className="flex h-[42px] min-w-0 flex-1 items-center gap-3 rounded-control border border-border bg-surface px-4 shadow-inner-soft">
                <Icon name="search" className="size-5 text-text-muted" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
                  placeholder="Search products or barcode..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <kbd className="hidden rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-semibold text-text-subtle sm:block">
                  Cmd K
                </kbd>
              </div>
              <Button variant="primary" className="h-[42px]" onClick={() => setScannerOpen(true)}>
                <Icon name="barcode" className="size-4" />
                Scan
              </Button>
            </div>
          </div>

          <div className="relative flex gap-2 overflow-x-auto rounded-control bg-surface-muted p-1">
            {retailCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`h-10 shrink-0 rounded-md px-5 text-sm font-medium transition ${
                  category === item
                    ? "category-tab-active bg-surface text-text shadow-low"
                    : "text-text-muted hover:bg-surface/70 hover:text-text"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="menu-grid-transition grid flex-1 auto-rows-max gap-4 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => (
            <article
              key={product.id}
              className={`menu-card-enter flex min-h-[304px] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-low transition ${
                product.stock <= 0 ? "opacity-55" : "hover:-translate-y-0.5 hover:shadow-panel"
              }`}
            >
              <div className="p-2 pb-0">
                <div className="grid aspect-[4/3] w-full content-between rounded-md border border-border bg-surface-muted p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid size-9 place-items-center rounded-md border border-border bg-surface text-text-muted">
                      <Icon name="barcode" className="size-5" />
                    </span>
                    <Badge tone={product.stock <= 5 ? "warning" : "neutral"}>
                      {product.stock} {product.unit}
                    </Badge>
                  </div>
                  <div className="grid gap-1">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">
                      Barcode
                    </p>
                    <p className="truncate font-mono text-sm font-semibold text-text">{product.barcode}</p>
                  </div>
                </div>
              </div>
              <div className="grid min-h-[118px] gap-3 p-4 pt-3">
                <Badge>{product.category}</Badge>
                <div className="grid content-start gap-1">
                  <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-tight text-text">{product.name}</h3>
                  <p className="text-sm font-medium text-text-muted">
                    <span className="font-mono tabular-nums">{formatPrice(product.price)}</span> / {product.unit}
                  </p>
                </div>
              </div>
              <div className="mt-auto grid gap-2 border-t border-border p-2">
                <Button
                  className="h-10 min-w-0 whitespace-nowrap px-3 text-base leading-none tracking-normal"
                  disabled={product.stock <= 0}
                  onClick={() => store.addToCart(product.id)}
                >
                  <Icon name={product.stock <= 0 ? "x" : "plus"} className="size-4" />
                  {product.stock <= 0 ? "Out of stock" : "Add to cart"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </main>

      <aside className="flex min-h-0 flex-col overflow-y-auto bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-xl font-semibold text-text">Cart</h2>
            <p className="text-sm text-text-muted">{store.cart.length} item types</p>
          </div>
          <Badge tone="accent">{store.cart.reduce((sum, item) => sum + item.qty, 0)} items</Badge>
        </div>

        <div className="border-b border-border">
          {store.cart.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-text-muted">Cart is empty</p>
          ) : (
            <div className="divide-y divide-border">
              {store.cart.map((item) => {
                const product = cartProducts.get(item.productId);
                return (
                  <CartRow
                    key={item.productId}
                    item={{ ...item, category: product?.category || item.barcode }}
                    subtotal={formatPrice(item.price * item.qty)}
                    onUpdateQty={(qty) => store.updateCartQty(item.productId, qty)}
                    onRemove={() => store.updateCartQty(item.productId, 0)}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-auto grid gap-5 p-4">
          <h2 className="text-xl font-semibold text-text">Total Payment</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "cash", label: "Cash", icon: "cash" },
              { id: "qris", label: "QRIS", icon: "qr" },
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id)}
                className={`grid place-items-center gap-1 rounded-md border py-2.5 text-xs font-semibold transition ${
                  paymentMethod === method.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-text-muted hover:bg-surface-muted"
                }`}
              >
                <Icon name={method.icon} className="size-4" />
                {method.label}
              </button>
            ))}
          </div>

          <dl className="grid gap-4 text-[15px]">
            <div className="flex justify-between text-text-muted">
              <dt>Subtotal</dt>
              <dd className="font-mono font-semibold tabular-nums">{formatPrice(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-text-muted">
              <dt>Tax</dt>
              <dd className="font-mono font-semibold tabular-nums">{formatPrice(totals.tax)}</dd>
            </div>
            <div className="border-t border-dashed border-border pt-4">
              <div className="flex justify-between text-lg font-semibold text-text">
                <dt>Grand Total</dt>
                <dd className="font-mono tabular-nums">{formatPrice(totals.total)}</dd>
              </div>
            </div>
          </dl>

          {paymentMethod === "cash" && (
            <Input
              label="Cash received"
              placeholder="150000"
              inputProps={{
                value: cashReceived,
                onChange: (event) => setCashReceived(event.target.value),
                inputMode: "numeric",
              }}
            />
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

          <Button variant="primary" className="checkout-3d h-14 text-base" onClick={checkout} disabled={store.cart.length === 0}>
            Complete sale
          </Button>
          <Button variant="secondary" onClick={store.clearCart}>
            Clear cart
          </Button>
        </div>
      </aside>

      <BarcodeScanner
        open={scannerOpen}
        title="Scan product barcode"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          store.addToCart(code);
          setScannerOpen(false);
        }}
      />
    </div>
  );
}
