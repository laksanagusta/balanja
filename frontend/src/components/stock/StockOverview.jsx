import React from "react";
import { Button, Icon } from "../primitives.jsx";
import {
  formatRelativeTime,
  getMovementPresentation,
  getStockProgress,
  LOW_STOCK_THRESHOLD,
  LOW_STOCK_VISIBLE_LIMIT,
} from "../../stock/stock-overview.js";

const numberFormatter = new Intl.NumberFormat("id-ID");

const movementToneClasses = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-accent-soft text-text-muted",
};

const sectionHeadingClassName = "font-mono text-xs font-semibold uppercase tracking-[0.16em] text-text";

export default function StockOverview({
  lowStockProducts = [],
  movements = [],
  threshold = LOW_STOCK_THRESHOLD,
  movementError = null,
  onRetry,
  hasMoreMovements = false,
  loadingMore = false,
  onLoadMore,
  onRestock,
}) {
  const visibleLowStock = lowStockProducts.slice(0, LOW_STOCK_VISIBLE_LIMIT);

  return (
    <div className="grid gap-8">
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
          <div className="mt-4 grid gap-3">
            {visibleLowStock.map((product) => (
              <LowStockCard
                key={product.id}
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
            <div className="mt-4 grid gap-3">
              {movements.map((movement) => (
                <MovementCard key={movement.id} movement={movement} />
              ))}
            </div>
            {(hasMoreMovements || movementError) && onLoadMore && (
              <Button
                type="button"
                variant="secondary"
                className="mx-auto mt-3 min-w-36"
                disabled={loadingMore}
                onClick={onLoadMore}
              >
                {loadingMore ? "Memuat..." : movementError ? "Coba lagi" : "Muat lebih banyak"}
              </Button>
            )}
          </>
        ) : movementError ? (
          <EmptyOverviewCard
            icon="help"
            title="Aktivitas stok gagal dimuat"
            description={movementError.message}
            action={onRetry ? <Button size="sm" variant="secondary" onClick={onRetry}>Coba lagi</Button> : null}
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

function LowStockCard({ product, threshold, onRestock }) {
  const stock = Number(product.stock) || 0;
  const progress = getStockProgress(stock, threshold);
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 text-left">
          <p className="truncate text-base font-semibold text-text">{product.name}</p>
          <p className="mt-1 truncate text-sm text-text-muted">
            {product.category || "Tanpa kategori"} · {product.unit || "pcs"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xl font-semibold leading-none text-danger tabular-nums">
            {numberFormatter.format(stock)}
          </p>
          <p className="mt-1.5 text-xs font-medium text-text-muted">
            Min: <span className="font-mono tabular-nums">{numberFormatter.format(threshold)}</span>
          </p>
        </div>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-label={`Stok ${product.name}`}
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.max(0, stock)}
      >
        <span
          className="block h-full rounded-full bg-linear-to-r from-danger to-warning"
          style={{ width: `${progress}%` }}
        />
      </div>
    </>
  );

  if (!onRestock) {
    return <article className="rounded-card bg-surface p-4 smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30">{content}</article>;
  }

  return (
    <button
      type="button"
      onClick={() => onRestock(product)}
      className="min-h-24 w-full rounded-card bg-surface p-4 text-left smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30 transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted/60 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      aria-label={`Tambah stok untuk ${product.name}`}
    >
      {content}
    </button>
  );
}

function MovementCard({ movement }) {
  const presentation = getMovementPresentation(movement.type);
  const actor = movement.createdByUserName || "Tidak diketahui";
  const quantity = Number(movement.quantityDelta) || 0;
  const quantityTone = quantity > 0 ? "text-success" : quantity < 0 ? "text-danger" : "text-text";

  return (
    <article className="grid min-h-24 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-card bg-surface p-4 smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30">
      <span className={`grid size-12 place-items-center rounded-card ${movementToneClasses[presentation.tone]}`}>
        <Icon name={presentation.icon} className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-text">{presentation.label}</p>
        <p className="mt-1 truncate text-sm text-text-muted">
          {movement.productName || "Produk tidak diketahui"} · {movement.reason || "Tanpa catatan"} · {actor}
        </p>
      </div>
      <div className="min-w-20 shrink-0 text-right">
        <p className={`font-mono text-lg font-semibold tabular-nums ${quantityTone}`}>
          {quantity > 0 ? "+" : ""}{numberFormatter.format(quantity)}
        </p>
        <time className="mt-1 block whitespace-nowrap text-xs text-text-muted" dateTime={movement.createdAt}>
          {formatRelativeTime(movement.createdAt)}
        </time>
      </div>
    </article>
  );
}

function EmptyOverviewCard({ icon, title, description, action = null }) {
  return (
    <div className="mt-4 grid min-h-36 place-items-center gap-2 rounded-panel bg-surface px-4 py-8 text-center smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30">
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
