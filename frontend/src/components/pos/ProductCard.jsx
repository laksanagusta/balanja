import React from "react";
import { Badge, Button, Icon } from "../primitives.jsx";
import { ProductImage } from "../product/ProductImage.jsx";

function useAddFeedback({ onAdd, disabled }) {
  const feedbackTimerRef = React.useRef(null);
  const [addFeedback, setAddFeedback] = React.useState(false);

  const handleAdd = () => {
    if (disabled) return;
    const result = onAdd?.();
    if (result && result.ok === false) return;
    setAddFeedback(false);
    window.requestAnimationFrame(() => setAddFeedback(true));
  };

  React.useEffect(() => {
    if (!addFeedback) return undefined;
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setAddFeedback(false), 520);
    return () => window.clearTimeout(feedbackTimerRef.current);
  }, [addFeedback]);

  return { addFeedback, handleAdd };
}

function ProductCardFrame({ product, outOfStock = false, addFeedback = false, className = "", children }) {
  return (
    <article
      className={`menu-card-enter flex min-h-[304px] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-low transition-transform duration-base ease-standard ${
        outOfStock ? "opacity-55" : "motion-safe:hover:-translate-y-0.5"
      } ${className}`}
    >
      <div className="p-2 pb-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-surface-muted">
          <ProductImage product={product} />
          {addFeedback && <span className="product-add-ring" aria-hidden="true" />}
          {addFeedback && (
            <span
              role="status"
              aria-live="polite"
              className="product-add-feedback absolute left-3 top-3 rounded-md bg-surface/95 px-2.5 py-1 text-xs font-semibold text-success shadow-low"
            >
              Ditambahkan
            </span>
          )}
          <div className="absolute right-3 top-3 flex items-center justify-end">
            {product.stock !== undefined && (
              <Badge tone={Number(product.stock) <= 10 ? "warning" : "neutral"} className="bg-surface/95">
                {product.stock} {product.unit || "pcs"}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-2 px-4 py-3">
        <Badge>{product.category}</Badge>
        <div className="grid content-start gap-1.5">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-text">{product.name}</h3>
          <p className="text-sm font-medium text-text-muted">
            <span className="font-mono tabular-nums">{product.price}</span> / {product.unit || "pcs"}
          </p>
        </div>
      </div>
      <div className="mt-auto grid gap-2 border-t border-border p-2">{children}</div>
    </article>
  );
}

export function ProductCard({ product, onAdd, onDecrease }) {
  const outOfStock = Number(product.stock) <= 0;
  const qty = Number(product.qty) || 0;
  const alreadyInCart = qty > 0;
  const blocked = outOfStock || alreadyInCart;
  const { addFeedback, handleAdd } = useAddFeedback({ onAdd, disabled: blocked });
  const buttonLabel = outOfStock ? "Stok habis" : alreadyInCart ? "Sudah di keranjang" : "Tambah ke keranjang";

  return (
    <ProductCardFrame product={product} outOfStock={outOfStock} addFeedback={addFeedback}>
      <div className="grid gap-2 min-[1500px]:grid-cols-[minmax(64px,80px)_minmax(90px,1fr)]">
        <div className="grid h-10 min-w-0 grid-cols-3 items-center rounded-md border border-border bg-surface text-center text-base font-semibold text-text">
          <button
            type="button"
            aria-label="Kurangi jumlah"
            className="grid h-full place-items-center text-text-muted transition hover:bg-surface-muted disabled:opacity-35"
            disabled={qty <= 0}
            onClick={onDecrease}
          >
            <Icon name="minus" className="size-4" />
          </button>
          <span className="grid h-full place-items-center overflow-hidden">
            <span key={qty} className="number-ticker">{qty}</span>
          </span>
          <button
            type="button"
            aria-label="Tambah jumlah"
            className="grid h-full place-items-center text-text-muted transition hover:bg-surface-muted disabled:opacity-35"
            disabled={outOfStock}
            onClick={handleAdd}
          >
            <Icon name="plus" className="size-4" />
          </button>
        </div>
        <Button className="product-add-button" disabled={blocked} onClick={handleAdd}>
          <span key={buttonLabel} className="button-label-pop">{buttonLabel}</span>
        </Button>
      </div>
    </ProductCardFrame>
  );
}

export function PosProductCard({ product, onAdd, disabled = false, actionLabel = "Tambah ke keranjang" }) {
  const outOfStock = Number(product.stock) <= 0;
  const blocked = disabled || outOfStock;
  const { addFeedback, handleAdd } = useAddFeedback({ onAdd, disabled: blocked });
  const buttonLabel = outOfStock ? "Stok habis" : actionLabel;

  return (
    <ProductCardFrame
      product={product}
      outOfStock={blocked}
      addFeedback={addFeedback}
      className="pos-product-card"
    >
      <Button className="product-add-button" disabled={blocked} onClick={handleAdd}>
        <span key={buttonLabel} className="button-label-pop">{buttonLabel}</span>
      </Button>
    </ProductCardFrame>
  );
}
