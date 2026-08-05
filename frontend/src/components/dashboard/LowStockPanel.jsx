import React from "react";
import { EmptyState } from "../feedback/EmptyState.jsx";
import { Badge, Button, Panel } from "../primitives.jsx";

export default function LowStockPanel({ products = [], count = products.length, onManageStock }) {
  const totalCount = Number.isFinite(Number(count)) ? Number(count) : products.length;
  const hasLowStock = totalCount > 0;
  const formattedTotalCount = totalCount.toLocaleString("id-ID");

  return (
    <Panel className="h-full min-w-0 overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text">Perlu perhatian</h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">Stok habis dan menipis yang perlu ditangani.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={hasLowStock ? "warning" : "success"}>{formattedTotalCount} item</Badge>
          {hasLowStock && onManageStock ? (
            <Button type="button" size="sm" variant="secondary" onClick={onManageStock}>
              Kelola stok
            </Button>
          ) : null}
        </div>
      </div>

      {hasLowStock && products.length ? (
        <div className="mt-4 rounded-card border border-border">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold text-text" title={product.name}>{product.name}</p>
                <p className="line-clamp-2 text-xs text-text-muted" title={`${product.category} · ${product.unit}`}>{product.category} · {product.unit}</p>
              </div>
              <span className={`shrink-0 rounded-control px-2 py-1 font-mono text-xs font-semibold tabular-nums ${
                Number(product.stock) === 0 ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
              }`}>
                {Number(product.stock) === 0 ? "Habis" : `Sisa ${Number(product.stock)}`}
              </span>
            </div>
          ))}
        </div>
      ) : hasLowStock ? (
        <EmptyState icon={null} title="Stok perlu ditangani" description="Buka Kelola stok untuk melihat produk yang perlu diisi ulang." className="mt-4 min-h-[210px]" />
      ) : (
        <EmptyState icon={null} title="Tidak ada yang perlu ditangani" description="Semua produk aktif memiliki stok lebih dari 10 unit." className="mt-4 min-h-[210px]" />
      )}

      {hasLowStock && products.length < totalCount ? (
        <p className="mt-3 text-center text-xs font-medium text-text-muted">
          Menampilkan {products.length} produk dengan stok terendah dari {formattedTotalCount} item.
        </p>
      ) : null}

    </Panel>
  );
}
