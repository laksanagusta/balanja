import React from "react";
import { Badge, Button, Icon, Panel } from "../primitives.jsx";
import { menuItems } from "../../data.js";

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
      onError={() => setSrc(src === fallback ? "" : fallback)}
    />
  );
}

export function ProductCard({
  product,
  onAdd,
  onDecrease,
  disabled = false,
  actionLabel = "Add to cart",
  showStepper = true,
  allowRepeatAdd = false,
}) {
  const feedbackTimerRef = React.useRef(null);
  const [addFeedback, setAddFeedback] = React.useState(false);
  const outOfStock = disabled || Number(product.stock) <= 0;
  const qty = Number(product.qty) || 0;
  const alreadyInCart = qty > 0;
  const addButtonText = outOfStock
    ? "Out of stock"
    : alreadyInCart && !allowRepeatAdd
      ? "Already in cart"
      : actionLabel;

  const handleAdd = () => {
    if (outOfStock || (alreadyInCart && !allowRepeatAdd)) return;
    onAdd?.();
    setAddFeedback(false);
    window.requestAnimationFrame(() => setAddFeedback(true));
  };

  React.useEffect(() => {
    if (!addFeedback) return undefined;
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setAddFeedback(false), 520);
    return () => window.clearTimeout(feedbackTimerRef.current);
  }, [addFeedback]);

  return (
    <article
      className={`menu-card-enter flex min-h-[304px] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-low transition ${
        outOfStock ? "opacity-55" : "hover:-translate-y-0.5 hover:shadow-panel"
      }`}
    >
      <div className="p-2 pb-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-surface-muted">
          <ProductImage product={product} />
          {addFeedback && <span className="product-add-ring" aria-hidden="true" />}
          {addFeedback && (
            <span className="product-add-feedback absolute left-3 top-3 rounded-md bg-surface/95 px-2.5 py-1 text-xs font-semibold text-success shadow-low">
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
      <div className={`mt-auto grid gap-2 border-t border-border p-2 ${showStepper ? "min-[1500px]:grid-cols-[minmax(64px,80px)_minmax(90px,1fr)]" : ""}`}>
        {showStepper && (
          <div className="grid h-10 min-w-0 grid-cols-3 items-center rounded-md border border-border bg-surface text-center text-base font-semibold text-text">
            <button
              type="button"
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
              className="grid h-full place-items-center text-text-muted transition hover:bg-surface-muted disabled:opacity-35"
              disabled={outOfStock}
              onClick={handleAdd}
            >
              <Icon name="plus" className="size-4" />
            </button>
          </div>
        )}
        <Button
          className="product-add-button"
          disabled={outOfStock || (alreadyInCart && !allowRepeatAdd)}
          onClick={handleAdd}
        >
          <span key={addButtonText} className="button-label-pop">
            {addButtonText}
          </span>
        </Button>
      </div>
    </article>
  );
}

export default function MenuCardShowcase() {
  return (
    <Panel className="grid gap-4 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Product card</h3>
        <p className="mt-1 text-sm text-text-muted">
          Retail card with product image, stock badge, category, IDR price, quantity stepper, and add-to-cart button.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {menuItems.slice(0, 4).map((item) => (
          <ProductCard key={item.name} product={item} />
        ))}
      </div>
    </Panel>
  );
}
