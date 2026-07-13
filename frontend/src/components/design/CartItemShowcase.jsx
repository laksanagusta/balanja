import React from "react";
import { Badge, Button, Icon } from "../primitives.jsx";

const cartFallbackImages = {
  Sembako: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
  Minuman: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80",
  Snack: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80",
  Perawatan: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80",
  "Rumah Tangga": "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
};

const sampleCart = [
  {
    name: "Mie Instan Goreng",
    category: "Makanan Instan",
    price: 3500,
    qty: 2,
    barcode: "8997001230035",
    image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Gula Pasir 1kg",
    category: "Sembako",
    price: 16500,
    qty: 1,
    barcode: "8997001230028",
    image: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Air Mineral 600ml",
    category: "Minuman",
    price: 4000,
    qty: 1,
    barcode: "8997001230042",
    image: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Deterjen Bubuk 800g",
    category: "Rumah Tangga",
    price: 18000,
    qty: 1,
    barcode: "8997001230066",
    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
  },
];

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value).replace(/\s+/g, "");
}

function CartImage({ item }) {
  const fallback = cartFallbackImages[item.category] || cartFallbackImages.Sembako;
  const [src, setSrc] = React.useState(item.image || fallback);

  React.useEffect(() => {
    setSrc(item.image || fallback);
  }, [item.image, fallback]);

  if (!src) {
    return (
      <span className="mt-0.5 grid size-14 shrink-0 place-items-center rounded-lg border border-border bg-surface-muted text-text-muted">
        <Icon name="barcode" className="size-6" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="mt-0.5 size-14 shrink-0 rounded-lg object-cover"
      onError={() => setSrc(src === fallback ? "" : fallback)}
    />
  );
}

export function CartRow({ item, subtotal, unitPrice, maxQty, onUpdateQty, onRemove }) {
  const stockLimit = Number(maxQty);
  const hasStockLimit = Number.isFinite(stockLimit);
  const plusDisabled = hasStockLimit && item.qty >= stockLimit;

  return (
    <div className="flex items-start gap-4 px-4 py-4">
      <CartImage item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{item.name}</p>
            {item.category && <p className="truncate text-xs text-text-muted">{item.category}</p>}
            {(unitPrice || item.barcode) && (
              <p className="truncate font-mono text-[11px] text-text-subtle">
                {unitPrice || item.barcode}
              </p>
            )}
          </div>
          {subtotal && (
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-text">
              {subtotal}
            </span>
          )}
        </div>
        {item.addons?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.addons.map((a) => (
              <span
                key={a}
                className="inline-flex items-center rounded-md border border-border bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-muted"
              >
                {a}
              </span>
            ))}
          </div>
        )}
        {(onUpdateQty || onRemove) && (
          <div className="mt-3 flex items-center gap-3">
            {onUpdateQty && (
              <div className="flex h-8 items-center rounded-md border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => onUpdateQty(Math.max(1, item.qty - 1))}
                  className="grid size-8 place-items-center text-text-muted transition hover:bg-surface-muted active:scale-90"
                >
                  <Icon name="minus" className="size-3.5" />
                </button>
                <span className="grid min-w-[2ch] place-items-center overflow-hidden text-center text-sm font-semibold text-text">
                  <span key={item.qty} className="number-ticker">
                    {item.qty}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQty(item.qty + 1)}
                  disabled={plusDisabled}
                  title={plusDisabled ? "Stock limit reached" : undefined}
                  className="grid size-8 place-items-center text-text-muted transition hover:bg-surface-muted active:scale-90 disabled:pointer-events-none disabled:opacity-35"
                >
                  <Icon name="plus" className="size-3.5" />
                </button>
              </div>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-text-muted transition hover:bg-surface hover:text-danger"
              >
                <Icon name="trash" className="size-3.5" />
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CartItemShowcase() {
  const [items, setItems] = React.useState(sampleCart);

  const updateQty = (name, qty) => {
    setItems((prev) => prev.map((i) => (i.name === name ? { ...i, qty } : i)));
  };

  const removeItem = (name) => {
    setItems((prev) => prev.filter((i) => i.name !== name));
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Cart list item</h3>
      <div className="rounded-panel border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">Cart items</p>
          <Badge tone="accent">{items.length} items</Badge>
        </div>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <CartRow
              key={item.name}
              item={item}
              subtotal={formatIDR(item.qty * item.price)}
              onUpdateQty={(q) => updateQty(item.name, q)}
              onRemove={() => removeItem(item.name)}
            />
          ))}
        </div>
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Subtotal</span>
            <span className="font-mono font-semibold tabular-nums text-text">
              {formatIDR(items.reduce((s, i) => s + i.price * i.qty, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
