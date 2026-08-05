import React from "react";
import { Button, Icon } from "../primitives.jsx";
import { ProductImage } from "../product/ProductImage.jsx";
import {
  formatRelativeTime,
  getMovementPresentation,
  LOW_STOCK_THRESHOLD,
  LOW_STOCK_VISIBLE_LIMIT,
} from "../../stock/stock-overview.js";
import { getStockErrorMessage } from "../../stock/stock-errors.js";

const numberFormatter = new Intl.NumberFormat("id-ID");

const movementToneClasses = {
  success: "bg-success-control text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
  neutral: "bg-accent text-white",
};

const sectionHeadingClassName = "font-sans text-xs font-semibold uppercase tracking-[0.16em] text-text";

export default function StockOverview({
  lowStockProducts = [],
  products = [],
  movements = [],
  threshold = LOW_STOCK_THRESHOLD,
  movementError = null,
  onRetry,
  hasMoreMovements = false,
  loadingMore = false,
  onLoadMore,
  onRestock,
  hasMovementFilters = false,
  onResetFilters,
}) {
  const visibleLowStock = lowStockProducts.slice(0, LOW_STOCK_VISIBLE_LIMIT);
  const movementErrorMessage = getStockErrorMessage(movementError);

  return (
    <div className="grid gap-6">
      <section aria-labelledby="low-stock-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="low-stock-heading" className={sectionHeadingClassName}>
            Stok menipis
          </h2>
          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
            lowStockProducts.length ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
          }`}>
            {numberFormatter.format(lowStockProducts.length)} item
          </span>
        </div>

        {visibleLowStock.length ? (
          <div className="mt-2 grid gap-0">
            {visibleLowStock.map((product) => (
              <LowStockRow
                key={`${product.id}|${product.variantId || ""}`}
                product={product}
                threshold={threshold}
                onRestock={onRestock}
              />
            ))}
          </div>
        ) : (
          <EmptyOverviewCard
            icon="check"
            title="Level stok terlihat sehat"
            description={`Produk aktif dengan stok ${threshold} unit atau kurang akan muncul di sini.`}
          />
        )}

        {lowStockProducts.length > visibleLowStock.length && (
          <p className="mt-3 text-center text-xs font-medium text-text-muted">
            Menampilkan {visibleLowStock.length} produk dengan stok terendah dari {numberFormatter.format(lowStockProducts.length)} item.
          </p>
        )}
      </section>

      <section aria-labelledby="recent-activity-heading">
        <h2 id="recent-activity-heading" className={sectionHeadingClassName}>
          Aktivitas terbaru
        </h2>

        {movements.length ? (
          <>
            <div className="mt-2 grid gap-0">
              {movements.map((movement) => (
                <MovementRow key={movement.id} movement={movement} products={products} />
              ))}
            </div>
            {(hasMoreMovements || movementError) && onLoadMore && (
              <>
                {movementError ? (
                  <div role="alert" className="mt-3 rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                    {movementErrorMessage}
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 w-full"
                  disabled={loadingMore}
                  onClick={onLoadMore}
                >
                  {loadingMore ? "Memuat…" : movementError ? "Coba lagi" : "Muat lebih banyak"}
                </Button>
              </>
            )}
          </>
        ) : movementError ? (
          <EmptyOverviewCard
            icon="help"
            title="Aktivitas stok gagal dimuat"
            description={movementErrorMessage}
            role="alert"
            action={onRetry ? <Button size="sm" variant="secondary" onClick={onRetry}>Coba lagi</Button> : null}
          />
        ) : hasMovementFilters ? (
          <EmptyOverviewCard
            icon="search"
            title="Tidak ada aktivitas yang cocok"
            description="Coba kata kunci atau jenis pergerakan lain."
            action={onResetFilters ? <Button size="sm" variant="ghost" onClick={onResetFilters}>Atur ulang filter</Button> : null}
          />
        ) : (
          <EmptyOverviewCard
            icon="package"
            title="Belum ada aktivitas stok"
            description="Buat pergerakan manual atau selesaikan transaksi untuk mengisi riwayat."
          />
        )}
      </section>
    </div>
  );
}

function LowStockRow({ product, threshold, onRestock }) {
  const stock = Number(product.stock) || 0;
  const unit = product.unit || "pcs";
  const content = (
    <div className="grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-2 text-left">
      <StockRowImage product={product} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-muted">
          Perlu diisi ulang · {product.category || "Tanpa kategori"} · {product.unit || "pcs"}
        </p>
        <p className="mt-0.5 truncate text-base font-semibold text-text">
          {product.name}{product.variantAttributes ? ` · ${product.variantAttributes}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-lg font-semibold leading-none text-danger tabular-nums">
          {numberFormatter.format(stock)} {unit}
        </p>
        <p className="mt-1 text-xs font-medium text-text-muted">
          Min {numberFormatter.format(threshold)} {unit}
        </p>
      </div>
    </div>
  );

  if (!onRestock) {
    return <article>{content}</article>;
  }

  return (
    <button
      type="button"
      onClick={() => onRestock(product)}
      className="w-full rounded-control text-left transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted/60 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      aria-label={`Tambah stok untuk ${product.name}${product.variantAttributes ? `, ${product.variantAttributes}` : ""}`}
    >
      {content}
    </button>
  );
}

function MovementRow({ movement, products }) {
  const presentation = getMovementPresentation(movement.type);
  const actor = movement.createdByUserName || "Tidak diketahui";
  const quantity = Number(movement.quantityDelta) || 0;
  const quantityTone = quantity > 0 ? "text-success" : quantity < 0 ? "text-danger" : "text-text";
  const context = [presentation.label, actor, movement.reason || "Tanpa catatan"].join(" · ");
  const product = getMovementProduct(movement, products);
  const unit = product.unit || movement.productUnit || "pcs";

  return (
    <article className="grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-2">
      <StockRowImage product={product} icon={presentation.icon} tone={presentation.tone} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-muted" title={context}>{context}</p>
        <p className="mt-0.5 truncate text-base font-semibold text-text">
          {movement.productName || "Produk tidak diketahui"}{movement.variantAttributes ? ` · ${movement.variantAttributes}` : ""}
        </p>
      </div>
      <div className="min-w-20 shrink-0 text-right">
        <p className={`font-mono text-lg font-semibold tabular-nums ${quantityTone}`}>
          {quantity > 0 ? "+" : ""}{numberFormatter.format(quantity)} {unit}
        </p>
        <time className="mt-1 block whitespace-nowrap text-xs text-text-muted" dateTime={movement.createdAt}>
          {formatRelativeTime(movement.createdAt)}
        </time>
      </div>
    </article>
  );
}

function getMovementProduct(movement, products) {
  const product = products.find((item) => item.id === movement.productId);
  const variant = movement.variantId
    ? product?.variants?.find((item) => item.id === movement.variantId)
    : null;

  return {
    ...(product || {}),
    image: movement.productImage || variant?.image || product?.image || "",
    category: product?.category || movement.productCategory || "",
  };
}

function EmptyOverviewCard({ icon, title, description, action = null, role }) {
  return (
    <div role={role} className="mt-2 grid min-h-36 place-items-center gap-2 rounded-panel border border-border bg-surface px-4 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-card bg-surface-muted text-text-muted">
        <Icon name={icon} className="size-5" />
      </span>
      <div>
        <p className="font-semibold text-text">{title}</p>
        <p className="mt-1 max-w-md text-sm leading-6 text-text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StockRowImage({ product, icon, tone }) {
  return (
    <span className="relative size-12 shrink-0">
      <span className="block size-12 overflow-hidden rounded-card bg-surface-muted">
        <ProductImage product={product} fallback="category" />
      </span>
      {icon ? (
        <span className={`absolute -left-1.5 -top-1.5 grid size-6 place-items-center rounded-full border-2 border-surface ${movementToneClasses[tone]}`}>
          <Icon name={icon} className="size-3" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        </span>
      ) : null}
    </span>
  );
}
