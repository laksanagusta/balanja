import React from "react";
import { Button, Icon } from "../primitives.jsx";

export function EmptyState({
  icon = "bag",
  title,
  description,
  action,
  className = "",
  titleClassName = "text-base",
  descriptionClassName = "text-sm",
  borderClassName = "border-2",
}) {
  return (
    <div className={`grid place-items-center gap-3 rounded-card ${borderClassName} border-dashed border-border bg-surface-muted p-8 text-center ${className}`}>
      {icon && (
        <span className="flex size-14 items-center justify-center rounded-full bg-surface text-text-subtle">
          <Icon name={icon} className="size-7" />
        </span>
      )}
      <div>
        <p className={`${titleClassName} font-semibold text-text`}>{title}</p>
        {description && <p className={`mt-0.5 ${descriptionClassName} text-text-muted`}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default function EmptyStateShowcase() {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Empty states</h3>
      <div className="grid gap-4 rounded-panel border border-border bg-surface p-4 sm:grid-cols-2">
        <EmptyState
          title="Cart is empty"
          description="Scan or add products to get started."
          action={<Button size="sm">Browse products</Button>}
        />
        <EmptyState
          icon="search"
          title="No results found"
          description="Try adjusting your search or filter."
          action={<Button size="sm" variant="ghost">Clear filters</Button>}
        />
        <EmptyState
          icon="receipt"
          title="No transactions yet"
          description="Transactions will appear here after checkout."
        />
        <EmptyState
          icon="printer"
          title="No receipt selected"
          description="Select a completed transaction to print."
        />
      </div>
    </div>
  );
}
