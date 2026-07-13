import React from "react";
import { Panel, Skeleton } from "../primitives.jsx";

export default function SkeletonShowcase() {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Skeleton & loading</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Loading placeholders for product cards, cart rows, tables, forms, and page shells.</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Page skeletons</p>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="grid gap-3 p-4">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3.5 w-40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20 rounded-card" />
                <Skeleton className="h-20 rounded-card" />
                <Skeleton className="h-20 rounded-card" />
                <Skeleton className="h-20 rounded-card" />
              </div>
            </Panel>
            <Panel className="grid gap-3 p-4">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3.5 w-48" />
              </div>
              <Skeleton className="h-10 rounded-card" />
              <div className="grid gap-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className={`h-4 ${index === 0 ? "w-full" : index === 1 ? "w-5/6" : index === 2 ? "w-3/4" : "w-2/3"}`} />
                ))}
              </div>
            </Panel>
            <Panel className="grid gap-3 p-4">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <Skeleton className="h-9 rounded-card" />
              <Skeleton className="h-9 rounded-card" />
              <Skeleton className="h-9 rounded-card" />
              <Skeleton className="h-9 rounded-card" />
            </Panel>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Cart list skeleton</p>
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
        <div className="mt-4 grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">POS shimmer rhythm</p>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="relative overflow-hidden rounded-card border border-border p-3 shadow-low">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="pos-skeleton-sheen h-full w-2/3" />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 rounded-card border border-border p-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="relative overflow-hidden rounded-md bg-surface-muted p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-md bg-surface" />
                    <div className="grid flex-1 gap-2">
                      <Skeleton className="h-4 w-3/5 bg-surface" />
                      <Skeleton className="h-3 w-2/5 bg-surface" />
                    </div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
                    style={{ animationDelay: `${180 + index * 60}ms` }}
                  >
                    <div className="pos-skeleton-sheen h-full w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
