import React from "react";
import { EmptyState } from "../feedback/EmptyState.jsx";
import { Badge, Button, Panel } from "../primitives.jsx";

export default function LowStockPanel({ products, onManageStock }) {
  return (
    <Panel className="min-w-0 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Stok menipis</h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">Produk aktif dengan stok 10 unit atau kurang.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={products.length ? "warning" : "success"}>{products.length} item</Badge>
          {products.length && onManageStock ? (
            <Button type="button" size="sm" variant="secondary" onClick={onManageStock}>
              Kelola stok
            </Button>
          ) : null}
        </div>
      </div>

      {products.length ? (
        <div className="mt-4 divide-y divide-border rounded-card border border-border">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{product.name}</p>
                <p className="truncate text-xs text-text-muted">{product.category} · {product.unit}</p>
              </div>
              <span className="shrink-0 rounded-control bg-warning-soft px-2 py-1 font-mono text-xs font-semibold text-warning tabular-nums">
                Sisa {Number(product.stock)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={null} title="Level stok terlihat sehat" description="Produk dengan stok 10 unit atau kurang akan muncul di sini." className="mt-4 min-h-[210px]" />
      )}

    </Panel>
  );
}
