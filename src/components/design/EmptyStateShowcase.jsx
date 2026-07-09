import React from "react";
import { Button, Icon } from "../primitives.jsx";

export default function EmptyStateShowcase() {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Empty states</h3>
      <div className="grid gap-4 rounded-panel border border-border bg-surface p-4 sm:grid-cols-2">
        <div className="grid place-items-center gap-3 rounded-card border border-dashed border-border bg-surface-muted p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface text-text-subtle">
            <Icon name="bag" className="size-7" />
          </span>
          <div>
            <p className="text-base font-semibold text-text">Cart is empty</p>
            <p className="mt-0.5 text-sm text-text-muted">Add items from the menu to get started.</p>
          </div>
          <Button size="sm">Browse menu</Button>
        </div>
        <div className="grid place-items-center gap-3 rounded-card border border-dashed border-border bg-surface-muted p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface text-text-subtle">
            <Icon name="search" className="size-7" />
          </span>
          <div>
            <p className="text-base font-semibold text-text">No results found</p>
            <p className="mt-0.5 text-sm text-text-muted">Try adjusting your search or filter.</p>
          </div>
          <Button size="sm" variant="ghost">Clear filters</Button>
        </div>
        <div className="grid place-items-center gap-3 rounded-card border border-dashed border-border bg-surface-muted p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface text-text-subtle">
            <Icon name="receipt" className="size-7" />
          </span>
          <div>
            <p className="text-base font-semibold text-text">No orders yet</p>
            <p className="mt-0.5 text-sm text-text-muted">Orders will appear here once placed.</p>
          </div>
        </div>
        <div className="grid place-items-center gap-3 rounded-card border border-dashed border-border bg-surface-muted p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface text-text-subtle">
            <Icon name="printer" className="size-7" />
          </span>
          <div>
            <p className="text-base font-semibold text-text">No receipt selected</p>
            <p className="mt-0.5 text-sm text-text-muted">Select a completed order to print.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
