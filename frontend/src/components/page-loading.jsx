import React from "react";
import { Panel, Skeleton } from "./primitives.jsx";

export function LoadingSheen({ delay = 0, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="pos-skeleton-sheen h-full w-2/3" />
    </div>
  );
}

function RiseSkeleton({ className = "", delay = 0, children }) {
  return (
    <div
      className={`relative overflow-hidden motion-safe:animate-[pos-skeleton-rise_560ms_var(--ease-standard)_both] ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function TableRowSkeleton({ columns = 7, delay = 0, tinted = false }) {
  return (
    <RiseSkeleton
      delay={delay}
      className={`grid min-h-11 items-center gap-3 rounded-card border border-border px-3 py-2 ${
        tinted ? "bg-surface-muted/45" : "bg-surface"
      }`}
    >
      <div
        className="grid min-w-0 items-center gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: columns }, (_, index) => (
          <div key={index} className="relative overflow-hidden rounded-md">
            <Skeleton className={`${index === 0 ? "h-4 w-4/5" : index === 1 ? "h-4 w-3/4" : "h-3.5 w-full"} bg-surface-muted/80`} />
            <LoadingSheen delay={delay + index * 60} />
          </div>
        ))}
      </div>
    </RiseSkeleton>
  );
}

function DashboardMetricSkeleton({ delay = 0 }) {
  return (
    <Panel className="relative overflow-hidden p-4 shadow-low">
      <div className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="relative overflow-hidden rounded-md">
            <Skeleton className="h-3.5 w-20 bg-surface-muted/80" />
            <LoadingSheen delay={delay} />
          </div>
          <Skeleton className="size-8 rounded-full bg-surface-muted/80" />
        </div>
        <div className="relative overflow-hidden rounded-md">
          <Skeleton className="h-8 w-2/3 bg-surface-muted/80" />
          <LoadingSheen delay={delay + 60} />
        </div>
        <div className="relative overflow-hidden rounded-md">
          <Skeleton className="h-3.5 w-5/6 bg-surface-muted/80" />
          <LoadingSheen delay={delay + 120} />
        </div>
      </div>
    </Panel>
  );
}

function ChartPanelSkeleton({ delay = 0, titleWidth = "w-28", bodyRows = 3, chartHeight = "h-[250px]" }) {
  return (
    <Panel className="min-w-0 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-2">
          <div className="relative overflow-hidden rounded-md">
            <Skeleton className={`h-4 ${titleWidth} bg-surface-muted/80`} />
            <LoadingSheen delay={delay} />
          </div>
          <div className="relative overflow-hidden rounded-md">
            <Skeleton className="h-3.5 w-48 bg-surface-muted/80" />
            <LoadingSheen delay={delay + 60} />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full bg-surface-muted/80" />
      </div>

      <div className={`relative mt-4 overflow-hidden rounded-panel border border-border bg-surface-muted/40 ${chartHeight}`}>
        <LoadingSheen delay={delay + 120} />
      </div>

      <div className="mt-4 grid gap-2">
        {Array.from({ length: bodyRows }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <div className="relative overflow-hidden rounded-md">
              <Skeleton className={`h-3.5 ${index === 0 ? "w-28" : "w-24"} bg-surface-muted/80`} />
              <LoadingSheen delay={delay + 180 + index * 40} />
            </div>
            <Skeleton className="h-3.5 w-12 bg-surface-muted/80" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function RetailPosSkeleton() {
  return (
    <div className="grid h-full min-h-0 overflow-y-auto bg-app-bg xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-hidden">
      <main className="flex min-h-[640px] flex-col border-border bg-surface xl:min-h-0 xl:border-r">
        <div className="bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative overflow-hidden rounded-md">
              <Skeleton className="h-5 w-28 bg-surface-muted/80" />
              <LoadingSheen delay={0} />
            </div>
            <div className="relative overflow-hidden rounded-card w-full lg:max-w-md">
              <Skeleton className="h-9 w-full bg-surface-muted/80" />
              <LoadingSheen delay={80} />
            </div>
          </div>

          <div className="px-6 py-3">
            <div className="flex h-[38px] gap-2 overflow-hidden rounded-control bg-surface-muted p-[5px]">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="relative overflow-hidden rounded-md">
                  <Skeleton className={`h-7 ${index === 0 ? "w-16" : index === 1 ? "w-20" : index === 2 ? "w-[4.5rem]" : "w-24"} bg-surface`} />
                  <LoadingSheen delay={120 + index * 60} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="menu-grid-transition grid flex-1 auto-rows-max gap-4 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <article
              key={index}
              className="relative overflow-hidden rounded-card border border-border bg-surface shadow-low motion-safe:animate-[pos-skeleton-rise_560ms_var(--ease-standard)_both]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="grid gap-3 p-2 pb-0">
                <div className="relative overflow-hidden rounded-md">
                  <Skeleton className="aspect-[4/3] w-full bg-surface-muted/80" />
                  <LoadingSheen delay={index * 70} />
                </div>
              </div>
              <div className="grid min-h-[118px] gap-3 p-4 pt-3">
                <div className="relative overflow-hidden rounded-control">
                  <Skeleton className="h-5 w-[4.5rem] bg-surface-muted/80" />
                  <LoadingSheen delay={index * 70 + 80} />
                </div>
                <div className="grid gap-2">
                  <div className="relative overflow-hidden rounded-md">
                    <Skeleton className="h-4 w-full bg-surface-muted/80" />
                    <LoadingSheen delay={index * 70 + 140} />
                  </div>
                  <div className="relative overflow-hidden rounded-md">
                    <Skeleton className="h-4 w-3/4 bg-surface-muted/80" />
                    <LoadingSheen delay={index * 70 + 200} />
                  </div>
                </div>
              </div>
              <div className="mt-auto grid gap-2 border-t border-border p-2">
                <Skeleton className="h-10 w-full bg-surface-muted/80" />
              </div>
            </article>
          ))}
        </div>
      </main>

      <aside className="flex min-h-[560px] flex-col overflow-hidden border-t border-border bg-surface xl:min-h-0 xl:border-t-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-20 bg-surface-muted/80" />
            <Skeleton className="h-4 w-16 bg-surface-muted/80" />
          </div>
          <Skeleton className="h-6 w-[4.5rem] bg-surface-muted/80" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="grid gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="relative overflow-hidden rounded-card bg-surface-muted p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 shrink-0 rounded-md bg-surface/80" />
                  <div className="grid flex-1 gap-2">
                    <Skeleton className="h-4 w-3/5 bg-surface/80" />
                    <Skeleton className="h-3 w-2/5 bg-surface/80" />
                  </div>
                  <Skeleton className="h-5 w-14 bg-surface/80" />
                </div>
                <LoadingSheen delay={300 + index * 70} />
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-auto grid gap-3 border-t border-border bg-surface px-4 py-3 shadow-[0_-10px_22px_-20px_rgb(29_29_31_/_0.32)]">
          <div className="grid gap-3 rounded-card border border-border bg-surface-muted p-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <Skeleton className="h-3 w-20 bg-surface" />
                <Skeleton className="h-4 w-[4.5rem] bg-surface" />
              </div>
            ))}
          </div>
          <Skeleton className="h-11 w-full rounded-card bg-accent/20" />
          <Skeleton className="h-9 w-full rounded-card bg-surface-muted/80" />
        </div>
      </aside>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="h-full overflow-auto bg-app-bg">
      <header className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Skeleton className="h-5 w-28 bg-surface-muted/80" />
          <Skeleton className="mt-2 h-3.5 w-56 bg-surface-muted/80" />
        </div>
        <div className="inline-flex w-fit rounded-control border border-border bg-surface-muted p-1">
          <Skeleton className="h-8 w-16 rounded-md bg-surface" />
          <Skeleton className="ml-1 h-8 w-16 rounded-md bg-surface" />
        </div>
      </header>

      <main className="grid gap-4 p-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key performance indicators">
          {Array.from({ length: 4 }, (_, index) => (
            <DashboardMetricSkeleton key={index} delay={index * 80} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8">
            <ChartPanelSkeleton delay={0} titleWidth="w-24" bodyRows={2} chartHeight="h-[260px]" />
          </div>
          <div className="min-w-0 xl:col-span-4">
            <ChartPanelSkeleton delay={120} titleWidth="w-28" bodyRows={4} chartHeight="h-[260px]" />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-7">
            <ChartPanelSkeleton delay={80} titleWidth="w-24" bodyRows={3} chartHeight="h-[250px]" />
          </div>
          <div className="min-w-0 xl:col-span-5">
            <Panel className="min-w-0 overflow-hidden p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-28 bg-surface-muted/80" />
                  <Skeleton className="h-3.5 w-40 bg-surface-muted/80" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-surface-muted/80" />
              </div>
              <div className="mt-4 grid gap-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface-muted p-3">
                    <div className="grid gap-2">
                      <Skeleton className="h-4 w-28 bg-surface" />
                      <Skeleton className="h-3 w-20 bg-surface" />
                    </div>
                    <Skeleton className="h-5 w-14 bg-surface" />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      </main>
    </div>
  );
}

export function TablePageSkeleton({
  titleWidth = "w-24",
  subtitleWidth = "w-72",
  buttonWidth = "w-28",
  rows = 6,
  columns = 7,
  showActionButton = true,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header
        className={`grid gap-3 border-b border-border px-6 py-3 lg:items-center ${
          showActionButton ? "lg:grid-cols-[auto_1fr_auto]" : "lg:grid-cols-[auto_1fr]"
        }`}
      >
        <div className="grid gap-2">
          <Skeleton className={`h-5 ${titleWidth} bg-surface-muted/80`} />
          <Skeleton className={`h-3.5 ${subtitleWidth} bg-surface-muted/80`} />
        </div>
        <div className="flex w-full min-w-0 lg:ml-auto lg:w-[420px]">
          <Skeleton className="h-9 w-full rounded-card bg-surface-muted/80" />
        </div>
        {showActionButton && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-control bg-surface-muted/80" />
            <Skeleton className={`h-9 ${buttonWidth} rounded-control bg-surface-muted/80`} />
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <Panel className="grid gap-0 overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <Skeleton className="h-4 w-32 bg-surface-muted/80" />
            <Skeleton className="mt-2 h-3.5 w-80 bg-surface-muted/80" />
          </div>
          <div className="grid gap-2 p-2">
            <div className="grid gap-2 border-b border-border px-1 pb-2 pt-1">
              <div
                className="grid gap-3 px-2"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: columns }, (_, index) => (
                  <Skeleton key={index} className="h-3.5 bg-surface-muted/80" />
                ))}
              </div>
            </div>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <TableRowSkeleton key={rowIndex} columns={columns} delay={rowIndex * 60} tinted={rowIndex % 2 === 1} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function ProductsPageSkeleton() {
  return (
    <TablePageSkeleton
      titleWidth="w-24"
      subtitleWidth="w-72"
      buttonWidth="w-28"
      rows={7}
      columns={7}
      showActionButton={true}
    />
  );
}

export function TransactionsPageSkeleton() {
  return (
    <TablePageSkeleton
      titleWidth="w-28"
      subtitleWidth="w-80"
      buttonWidth="w-24"
      rows={7}
      columns={7}
      showActionButton={false}
    />
  );
}

export function StockPageSkeleton() {
  return (
    <TablePageSkeleton
      titleWidth="w-20"
      subtitleWidth="w-80"
      buttonWidth="w-36"
      rows={7}
      columns={8}
      showActionButton={true}
    />
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="min-h-full overflow-auto bg-app-bg">
      <header className="border-b border-border p-4">
        <Skeleton className="h-8 w-28 bg-surface-muted/80" />
        <Skeleton className="mt-2 h-4 w-72 bg-surface-muted/80" />
      </header>

      <main className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-4">
          <div className="grid gap-4">
            <div className="border-b border-border pb-3">
              <Skeleton className="h-4 w-24 bg-surface-muted/80" />
              <Skeleton className="mt-2 h-3.5 w-72 bg-surface-muted/80" />
            </div>

            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="grid gap-2">
                <Skeleton className="h-3.5 w-20 bg-surface-muted/80" />
                <Skeleton className="h-9 w-full rounded-card bg-surface-muted/80" />
              </div>
            ))}

            <div className="grid gap-3 rounded-card border border-border bg-surface-muted p-4">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-24 bg-surface" />
                <Skeleton className="h-5 w-11 rounded-full bg-surface" />
              </div>
              <Skeleton className="h-3.5 w-20 bg-surface" />
              <Skeleton className="h-9 w-full rounded-card bg-surface" />
            </div>

            <div className="flex justify-end">
              <Skeleton className="h-9 w-32 rounded-control bg-surface-muted/80" />
            </div>
          </div>
        </Panel>

        <aside className="grid content-start gap-4">
          <Panel className="grid gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-28 bg-surface-muted/80" />
              <Skeleton className="h-5 w-20 rounded-full bg-surface-muted/80" />
            </div>
            <div className="grid gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="grid gap-2">
                  <Skeleton className="h-3.5 w-14 bg-surface-muted/80" />
                  <Skeleton className="h-4 w-48 bg-surface-muted/80" />
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </main>
    </div>
  );
}
