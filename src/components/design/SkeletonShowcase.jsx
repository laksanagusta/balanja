import React from "react";
import { Skeleton } from "../primitives.jsx";

export default function SkeletonShowcase() {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Skeleton & loading</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Loading placeholders for menu items, orders, and lists.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-3 rounded-card border border-border p-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
          <div className="grid gap-3 rounded-card border border-border p-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
          <div className="grid gap-3 rounded-card border border-border p-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Order list skeleton</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-md bg-surface-muted p-3">
              <Skeleton className="size-12 shrink-0 rounded-md" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
