import React from "react";
import { formatPrice } from "../../shared.jsx";
import { ProductThumbnail } from "./ProductImage.jsx";

const formatQuantity = (value) => new Intl.NumberFormat("id-ID").format(Number(value) || 0);
const formatListPrice = (value) => formatPrice(value).replace(/^Rp/, "");

function ProductListRow({
  product,
  onSelect,
  disabled,
  getCategory,
  getUnit,
  priceField,
  entering,
}) {
  const enteringOnMount = React.useRef(entering).current;
  const [entered, setEntered] = React.useState(!enteringOnMount);

  React.useEffect(() => {
    if (!enteringOnMount) return undefined;

    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [enteringOnMount]);

  const isActive = product.active !== false;
  const stock = Number(product.stock) || 0;
  const configuredVariants = product.attributesConfig?.length > 0
    ? (product.variants || []).filter((variant) => Object.keys(variant.attributes || {}).length > 0)
    : [];
  const activeVariants = configuredVariants.filter((variant) => variant.active !== false);
  const hasVariants = activeVariants.length > 0;
  const variantStock = activeVariants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0);

  return (
    <li
      className={`transition-[opacity,transform] duration-base ease-standard motion-reduce:transform-none motion-reduce:duration-fast ${
        entered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={`Ubah produk ${product.name}`}
        onClick={() => onSelect?.(product)}
        className="group grid min-h-32 w-full grid-cols-[minmax(0,1fr)_5rem] items-center gap-4 px-4 py-4 text-left transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted/65 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
      >
        <span className="flex min-h-20 min-w-0 self-center flex-col">
          <span className="line-clamp-2 text-base font-semibold leading-5 text-text">
            {product.name}
          </span>
          <span className="mt-1 truncate text-sm leading-5 text-text-muted">
            <span>{getCategory(product)}</span>
            {product.barcode ? (
              <>
                <span aria-hidden="true"> · </span>
                <span className="font-mono text-xs font-medium tabular-nums tracking-[0.01em]">
                  {product.barcode}
                </span>
              </>
            ) : null}
          </span>
            <span className="mt-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-sm text-text">
              <span className="font-mono font-semibold tabular-nums">{formatListPrice(product[priceField] ?? 0)}</span>
              <span aria-hidden="true" className="text-text-subtle">·</span>
              {hasVariants ? (
                <span className={variantStock <= 5 ? "font-semibold text-warning" : "text-text-muted"}>
                  <span>{activeVariants.length} variasi</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums">{formatQuantity(variantStock)}</span>
                  {" "}
                  <span>{getUnit(product)}</span>
                </span>
              ) : (
                <span className={stock <= 5 ? "font-semibold text-warning" : "text-text-muted"}>
                  <span className="font-mono tabular-nums">{formatQuantity(stock)}</span>
                  {" "}
                  <span>{getUnit(product)}</span>
                </span>
              )}
              <span
              className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-semibold ${
                isActive ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
              }`}
            >
              {isActive ? "Aktif" : "Nonaktif"}
            </span>
          </span>
        </span>
        <ProductThumbnail product={product} size="xl" radius="control" />
      </button>
    </li>
  );
}

export function ProductList({
  products,
  onSelect,
  disabled = false,
  getCategory = (product) => product.category || "Tanpa kategori",
  getUnit = (product) => product.unit || "unit",
  priceField = "price",
  enteringIds = [],
}) {
  const enteringIdSet = React.useMemo(
    () => new Set(enteringIds.map(String)),
    [enteringIds],
  );

  return (
    <ul aria-label="Daftar produk" className="divide-y divide-border">
      {products.map((product) => (
        <ProductListRow
          key={product.id || product.sku}
          product={product}
          onSelect={onSelect}
          disabled={disabled}
          getCategory={getCategory}
          getUnit={getUnit}
          priceField={priceField}
          entering={enteringIdSet.has(String(product.id || product.sku))}
        />
      ))}
    </ul>
  );
}
