import React from "react";
import { Icon } from "../primitives.jsx";
import { ProductImage } from "../product/ProductImage.jsx";

function CartImage({ item }) {
  return (
    <span className="mt-0.5 block size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-muted">
      <ProductImage product={item} />
    </span>
  );
}

export function CartRow({ item, subtotal, unitPrice, maxQty, onUpdateQty, onRemove }) {
  const stockLimit = Number(maxQty);
  const hasStockLimit = Number.isFinite(stockLimit);
  const plusDisabled = hasStockLimit && item.qty >= stockLimit;
  const qtyInputRef = React.useRef(null);
  const previousQtyRef = React.useRef(item.qty);
  const qtySlideAnimationRef = React.useRef(null);
  const [draftQty, setDraftQty] = React.useState(String(item.qty));
  const [qtyInputMotion, setQtyInputMotion] = React.useState(null);

  React.useEffect(() => {
    const previousQty = previousQtyRef.current;
    previousQtyRef.current = item.qty;
    setDraftQty(String(item.qty));

    if (previousQty === item.qty || typeof window === "undefined") return undefined;
    const frame = window.requestAnimationFrame(() => {
      const input = qtyInputRef.current;
      if (
        !input
        || document.activeElement === input
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches
        || typeof input.animate !== "function"
      ) return;

      qtySlideAnimationRef.current?.cancel();
      const startY = item.qty > previousQty ? "55%" : "-55%";
      qtySlideAnimationRef.current = input.animate(
        [
          { color: "var(--color-accent)", opacity: 0.35, transform: `translateY(${startY})` },
          { color: "inherit", opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 160,
          easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        },
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [item.qty]);

  React.useEffect(() => () => qtySlideAnimationRef.current?.cancel(), []);

  const commitQuantity = () => {
    const parsedQty = Number.parseInt(draftQty, 10);
    if (!Number.isSafeInteger(parsedQty)) {
      setDraftQty(String(item.qty));
      return;
    }
    const nextQty = hasStockLimit ? Math.min(parsedQty, stockLimit) : parsedQty;
    onUpdateQty(nextQty);
  };

  const handleQuantityInputChange = (event) => {
    setDraftQty(event.target.value.replace(/\D/g, ""));
    setQtyInputMotion((currentMotion) => (
      currentMotion === "cart-qty-text-morph-a" ? "cart-qty-text-morph-b" : "cart-qty-text-morph-a"
    ));
  };

  return (
    <div className="flex items-start gap-4 px-4 py-4">
      <CartImage item={item} />
      <div className="min-w-0 flex-1">
        <div className="cart-item-heading-row items-start gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{item.name}</p>
            {item.category && <p className="truncate text-xs text-text-muted">{item.category}</p>}
            {(unitPrice || item.barcode) && (
              <p className="truncate font-mono text-[11px] text-text-subtle">{unitPrice || item.barcode}</p>
            )}
          </div>
          <div className="cart-item-summary-actions grid justify-items-end gap-2">
            {subtotal && <span className="shrink-0 whitespace-nowrap font-mono text-sm font-semibold tabular-nums text-text">{subtotal}</span>}
            {(onUpdateQty || onRemove) && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {onRemove && (
                  <button type="button" onClick={onRemove} className="pos-touch-target flex items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-text-muted transition hover:bg-surface hover:text-danger active:scale-[0.97]">
                    <Icon name="trash" className="size-3.5" />
                    Hapus
                  </button>
                )}
                {onUpdateQty && (
                  <div className="flex h-7 items-center rounded-md border border-border bg-surface">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onUpdateQty(item.qty === 1 ? 0 : item.qty - 1)}
                      className="pos-compact-icon-target grid place-items-center text-text-muted transition hover:bg-surface-muted active:scale-[0.97]"
                    >
                      <Icon name="minus" className="size-3.5" />
                    </button>
                    <input
                      ref={qtyInputRef}
                      aria-label="Kuantitas"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={draftQty}
                      onChange={handleQuantityInputChange}
                      onBlur={commitQuantity}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") {
                          setDraftQty(String(item.qty));
                          event.currentTarget.blur();
                        }
                      }}
                      className="cart-qty-input h-full w-8 bg-transparent text-center font-mono text-xs font-semibold tabular-nums text-text outline-none focus-visible:bg-surface-muted"
                      style={qtyInputMotion ? { animationName: qtyInputMotion } : undefined}
                    />
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onUpdateQty(item.qty + 1)}
                      disabled={plusDisabled}
                      title={plusDisabled ? "Stock limit reached" : undefined}
                      className="pos-compact-icon-target grid place-items-center text-text-muted transition hover:bg-surface-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35"
                    >
                      <Icon name="plus" className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
      </div>
    </div>
  );
}
