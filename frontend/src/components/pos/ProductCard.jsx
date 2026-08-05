import React from "react";
import NumberFlow from "@number-flow/react";
import { Badge, Button, Icon } from "../primitives.jsx";
import { ProductImage } from "../product/ProductImage.jsx";

function useAddFeedback({ onAdd, disabled }) {
  const feedbackTimerRef = React.useRef(null);
  const [addFeedback, setAddFeedback] = React.useState(false);

  const handleAdd = () => {
    if (disabled) return;
    const result = onAdd?.();
    if (result && result.ok === false) return;
    setAddFeedback(true);
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setAddFeedback(false), 520);
  };

  React.useEffect(() => {
    return () => window.clearTimeout(feedbackTimerRef.current);
  }, []);

  return { addFeedback, handleAdd };
}

function ProductCardFrame({
  product,
  outOfStock = false,
  addFeedback = false,
  className = "",
  mediaAction = null,
  priceOnly = false,
  showStockBadge = true,
  children,
}) {
  return (
    <article
      className={`product-card-frame menu-card-enter flex flex-col transition-transform duration-base ease-standard motion-reduce:transition-none ${
        priceOnly
          ? "overflow-visible rounded-none border-0 bg-transparent shadow-none"
          : "overflow-hidden rounded-card border border-border bg-surface shadow-low"
      } ${outOfStock ? "is-out-of-stock opacity-55" : ""} ${className}`}
    >
      <div className={`product-card-media-shell ${priceOnly ? "p-0" : "p-2 pb-0"}`}>
        <div
          className={`product-card-media relative w-full overflow-hidden bg-surface-muted ${
            priceOnly
              ? "aspect-square rounded-panel border-0"
              : "aspect-[4/3] rounded-md border border-border"
          }`}
        >
          <ProductImage product={product} />
          <span className="product-add-ring" data-visible={addFeedback} aria-hidden="true" />
          <span
            role="status"
            aria-live="polite"
            data-visible={addFeedback}
            className="product-add-feedback absolute left-3 top-3 rounded-md bg-surface/95 px-2.5 py-1 text-xs font-semibold text-success shadow-low"
          >
            {addFeedback ? "Ditambahkan" : ""}
          </span>
          {showStockBadge && (
            <div className="product-card-stock-badge absolute left-3 top-3 flex items-center">
              {!addFeedback && product.stock !== undefined && (
                <Badge tone={Number(product.stock) <= 10 ? "warning" : "neutral"} className="bg-surface/95">
                  {product.stock} {product.unit || "pcs"}
                </Badge>
              )}
            </div>
          )}
          {mediaAction}
        </div>
      </div>
      <div className={`product-card-content grid ${priceOnly ? "gap-1 px-0 pb-0 pt-2.5" : "gap-2 px-2 pb-0 pt-3"}`}>
        <div className="grid content-start gap-1.5">
          <h3
            className={`product-card-name line-clamp-2 text-text ${
              priceOnly ? "text-[15px] font-medium leading-[1.35]" : "text-sm font-semibold leading-tight"
            }`}
          >
            {product.name}
          </h3>
          <p
            className={`product-card-price ${
              priceOnly ? "font-mono text-[15px] font-semibold leading-tight text-text" : "text-xs font-medium text-text-muted"
            }`}
          >
            <span className={priceOnly ? "tabular-nums" : "font-mono tabular-nums"}>{product.price}</span>
            {!priceOnly && <> / {product.unit || "pcs"}</>}
          </p>
        </div>
      </div>
      {children && <div className="product-card-actions grid gap-2 px-2 pb-2 pt-2">{children}</div>}
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
            <NumberFlow value={qty} locales="id-ID" className="font-mono tabular-nums" />
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
        <Button variant="primary" className="product-add-button pos-touch-target" disabled={blocked} onClick={handleAdd}>
          <span key={buttonLabel} className="button-label-pop">{buttonLabel}</span>
        </Button>
      </div>
    </ProductCardFrame>
  );
}

export function PosProductCard({ product, onAdd, onOpenVariants, disabled = false }) {
  const outOfStock = Number(product.stock) <= 0;
  const hasMultipleVariants = product.attributesConfig?.length > 0 && Array.isArray(product.variants) && product.variants.length > 1;
  const blocked = disabled || outOfStock;
  const { addFeedback, handleAdd } = useAddFeedback({
    onAdd: () => {
      if (hasMultipleVariants) { onOpenVariants?.(product); return { ok: true }; }
      return onAdd?.();
    },
    disabled: blocked,
  });

  return (
    <ProductCardFrame
      product={product}
      outOfStock={blocked}
      addFeedback={addFeedback}
      className="pos-product-card"
      priceOnly
      showStockBadge={false}
      mediaAction={(
        <Button
          variant="primary"
          className="product-add-button pos-touch-target"
          disabled={blocked}
          aria-label={outOfStock ? `${product.name}: stok habis` : `Tambah ${product.name}`}
          onClick={handleAdd}
        >
          <span
            className="product-add-button-surface"
            aria-hidden="true"
          >
            <Icon name="plus" className="size-5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </span>
        </Button>
      )}
    >
      {hasMultipleVariants && (
        <p className="text-[11px] font-medium text-text-muted">{product.variants.length} variasi</p>
      )}
    </ProductCardFrame>
  );
}
