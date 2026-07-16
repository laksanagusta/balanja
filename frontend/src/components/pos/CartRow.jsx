import React from "react";
import { Icon } from "../primitives.jsx";

const cartFallbackImages = {
  Sembako: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
  Minuman: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80",
  Snack: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80",
  Perawatan: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80",
  "Rumah Tangga": "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
};

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
      loading="lazy"
      decoding="async"
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
              <p className="truncate font-mono text-[11px] text-text-subtle">{unitPrice || item.barcode}</p>
            )}
          </div>
          {subtotal && <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-text">{subtotal}</span>}
        </div>
        {item.addons?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.addons.map((addon) => (
              <span key={addon} className="inline-flex items-center rounded-md border border-border bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-muted">
                {addon}
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
                  <span key={item.qty} className="number-ticker">{item.qty}</span>
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
              <button type="button" onClick={onRemove} className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-text-muted transition hover:bg-surface hover:text-danger">
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
