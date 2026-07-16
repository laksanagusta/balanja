import React from "react";
import { Badge, Button, Icon } from "../primitives.jsx";

const productFallbackImages = {
  Sembako: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
  Minuman: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80",
  Snack: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80",
  Perawatan: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80",
  "Rumah Tangga": "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
};

function ProductImage({ product }) {
  const fallback = productFallbackImages[product.category] || productFallbackImages.Sembako;
  const [src, setSrc] = React.useState(product.image || fallback);

  React.useEffect(() => {
    setSrc(product.image || fallback);
  }, [product.image, fallback]);

  if (!src) {
    return (
      <div className="grid h-full place-items-center p-3 text-text-muted">
        <Icon name="package" className="size-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setSrc(src === fallback ? "" : fallback)}
    />
  );
}

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
              Added
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
  const buttonLabel = outOfStock ? "Out of stock" : alreadyInCart ? "Already in cart" : "Add to cart";

  return (
    <ProductCardFrame product={product} outOfStock={outOfStock} addFeedback={addFeedback}>
      <div className="grid gap-2 min-[1500px]:grid-cols-[minmax(64px,80px)_minmax(90px,1fr)]">
        <div className="grid h-10 min-w-0 grid-cols-3 items-center rounded-md border border-border bg-surface text-center text-base font-semibold text-text">
          <button
            type="button"
            aria-label="Decrease quantity"
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
            aria-label="Increase quantity"
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

export function PosProductCard({ product, onAdd, disabled = false, actionLabel = "Add to cart" }) {
  const outOfStock = disabled || Number(product.stock) <= 0;
  const { addFeedback, handleAdd } = useAddFeedback({ onAdd, disabled: outOfStock });
  const buttonLabel = outOfStock ? "Out of stock" : actionLabel;

  return (
    <ProductCardFrame
      product={product}
      outOfStock={outOfStock}
      addFeedback={addFeedback}
      className="pos-product-card"
    >
      <Button className="product-add-button" disabled={outOfStock} onClick={handleAdd}>
        <span key={buttonLabel} className="button-label-pop">{buttonLabel}</span>
      </Button>
    </ProductCardFrame>
  );
}
