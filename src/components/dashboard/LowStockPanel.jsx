import React from "react";
import { EmptyState } from "../design/EmptyStateShowcase.jsx";
import { Badge, Panel } from "../primitives.jsx";

export default function LowStockPanel({ products }) {
  return (
    <Panel className="min-w-0 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Low-stock watch</h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">Active products with 10 units or fewer.</p>
        </div>
        <Badge tone={products.length ? "warning" : "success"}>{products.length} items</Badge>
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
                {Number(product.stock)} left
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={null} title="Stock levels look healthy" description="Products at or below 10 units will appear here." className="mt-4 min-h-[210px]" />
      )}

    </Panel>
  );
}
