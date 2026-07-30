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

function DashboardMetricSkeleton({ delay = 0, emphasis = false }) {
  return (
    <Panel className={`relative overflow-hidden ${emphasis ? "p-5" : "p-4"}`}>
      <div className="grid gap-3">
        <div className="relative overflow-hidden rounded-md">
          <Skeleton className="h-3.5 w-20 bg-surface-muted/80" />
          <LoadingSheen delay={delay} />
        </div>
        <div className="relative overflow-hidden rounded-md">
          <Skeleton className={`${emphasis ? "h-9" : "h-8"} w-2/3 bg-surface-muted/80`} />
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
    <div className="retail-pos-query h-full min-h-0">
      <div className="retail-pos-workspace grid h-full min-h-0 bg-app-bg">
      <main className="retail-pos-catalog-pane flex min-w-0 flex-col border-border bg-surface">
        <header className="grid flex-none gap-2 px-4 py-3">
          <Skeleton className="h-11 w-full rounded-card bg-surface-muted/80" />
          <div className="flex min-w-0 gap-1 overflow-hidden">
            {["w-20", "w-24", "w-20", "w-24"].map((width, index) => (
              <Skeleton key={index} className={`h-8 shrink-0 rounded-full bg-surface-muted/80 ${width}`} />
            ))}
          </div>
        </header>
        <div className="product-catalog-grid menu-grid-transition grid auto-rows-max gap-4 p-3 sm:p-6">
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
              <div className="mt-auto grid gap-2 p-2">
                <Skeleton className="h-11 w-full bg-surface-muted/80" />
              </div>
            </article>
          ))}
        </div>
      </main>

      <aside className="retail-pos-cart-pane corner-smoothing-overlay flex min-w-0 flex-col border-border bg-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-20 bg-surface-muted/80" />
            <Skeleton className="h-4 w-16 bg-surface-muted/80" />
          </div>
          <Skeleton className="h-6 w-[4.5rem] bg-surface-muted/80" />
        </div>

        <div className="retail-pos-cart-list px-4 py-3">
          <div className="cart-item-list -mx-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="cart-item-row relative grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-3 overflow-hidden px-4 py-3">
                <Skeleton className="size-12 shrink-0 rounded-lg bg-surface-muted/80" />
                <div className="min-w-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="grid gap-1.5">
                      <Skeleton className="h-4 w-4/5 bg-surface-muted/80" />
                      <Skeleton className="h-3 w-2/5 bg-surface-muted/80" />
                    </div>
                    <Skeleton className="h-4 w-14 bg-surface-muted/80" />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <Skeleton className="h-8 w-24 rounded-md bg-surface-muted/80" />
                    <Skeleton className="h-8 w-16 rounded-md bg-surface-muted/80" />
                  </div>
                </div>
                <LoadingSheen delay={300 + index * 70} />
              </div>
            ))}
          </div>
        </div>

        <div className="retail-pos-cart-footer z-10 mt-auto grid gap-3 bg-surface px-4 py-3 shadow-[0_-10px_22px_-20px_rgb(29_29_31_/_0.32)]">
          <div className="grid gap-3 rounded-card border border-border bg-surface-muted p-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <Skeleton className="h-3 w-20 bg-surface" />
                <Skeleton className="h-4 w-[4.5rem] bg-surface" />
              </div>
            ))}
          </div>
          <Skeleton className="h-11 w-full rounded-card bg-accent/20" />
          <Skeleton className="h-11 w-full rounded-card bg-surface-muted/80" />
        </div>
      </aside>
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="h-full overflow-auto bg-app-bg">
      <main className="grid gap-4 p-4">
        <section className="flex flex-wrap items-center justify-between gap-3" aria-label="Loading dashboard period">
          <Skeleton className="h-4 w-40 bg-surface-muted/80" />
          <div className="inline-flex rounded-control border border-border bg-surface-muted p-1">
            <Skeleton className="h-8 w-16 rounded-md bg-surface" />
            <Skeleton className="ml-1 h-8 w-14 rounded-md bg-surface" />
            <Skeleton className="ml-1 h-8 w-16 rounded-md bg-surface" />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key performance indicators">
          <div className="min-w-0 sm:col-span-2 xl:col-span-2">
            <DashboardMetricSkeleton delay={0} emphasis />
          </div>
          <DashboardMetricSkeleton delay={80} />
          <DashboardMetricSkeleton delay={160} />
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-4 xl:col-start-9 xl:row-start-1">
            <Panel className="h-full min-w-0 overflow-hidden p-4">
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
          <div className="min-w-0 xl:col-span-8 xl:col-start-1 xl:row-start-1">
            <ChartPanelSkeleton delay={0} titleWidth="w-24" bodyRows={2} chartHeight="h-[260px]" />
          </div>
        </section>

        <Panel className="min-w-0 overflow-hidden p-4">
          <Skeleton className="h-4 w-28 bg-surface-muted/80" />
          <div className="mt-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_5rem] items-center gap-3 py-2.5">
                <Skeleton className="h-3 w-5 bg-surface-muted/80" />
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-32 bg-surface-muted/80" />
                  <Skeleton className="h-3 w-20 bg-surface-muted/80" />
                </div>
                <Skeleton className="h-4 w-full bg-surface-muted/80" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-9 w-full rounded-card bg-surface-muted/80" />
        </Panel>
      </main>
    </div>
  );
}

export function SalesReportPageSkeleton() {
  return (
    <div className="h-full overflow-auto bg-app-bg" aria-busy="true">
      <header className="bg-surface px-4 py-3">
        <Skeleton className="h-3.5 w-72 bg-surface-muted/80" />
      </header>
      <div className="grid gap-3 bg-surface p-4">
        <div className="flex flex-wrap gap-2">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-8 w-24 bg-surface-muted/80" />)}</div>
        <div className="grid gap-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 w-full bg-surface-muted/80" />)}</div>
      </div>
      <main className="grid gap-4 p-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <DashboardMetricSkeleton key={index} delay={index * 50} />)}</section>
        <Panel className="p-4"><Skeleton className="h-16 w-full bg-danger-soft/40" /></Panel>
        <ChartPanelSkeleton chartHeight="h-[260px]" titleWidth="w-36" />
        <section className="grid gap-4 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <ChartPanelSkeleton key={index} chartHeight="h-[220px]" titleWidth="w-28" delay={index * 70} />)}</section>
      </main>
    </div>
  );
}

export function TablePageSkeleton({
  buttonWidth = "w-28",
  rows = 6,
  columns = 7,
  showActionButton = true,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="grid gap-3 px-4 py-3">
        <div className="flex w-full min-w-0">
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
          <div className="px-4 py-3">
            <Skeleton className="h-4 w-32 bg-surface-muted/80" />
            <Skeleton className="mt-2 h-3.5 w-80 bg-surface-muted/80" />
          </div>
          <div className="grid gap-2 p-2">
            <div className="grid gap-2 px-1 pb-2 pt-1">
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
    <div className="flex h-full min-h-0 flex-col bg-surface" aria-busy="true">
      <header className="px-4 py-3">
        <div className="grid w-full gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-11 min-w-0 flex-1 rounded-card bg-surface-muted/80" />
            <Skeleton className="size-11 shrink-0 rounded-full bg-surface-muted/80" />
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="w-full overflow-hidden rounded-panel border border-border bg-surface">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid min-h-32 grid-cols-[minmax(0,1fr)_5rem] items-center gap-4 px-4 py-4">
              <div className="grid self-stretch">
                <Skeleton className={`h-5 bg-surface-muted/80 ${index % 2 ? "w-2/3" : "w-4/5"}`} />
                <Skeleton className="mt-2 h-4 w-1/2 bg-surface-muted/80" />
                <div className="mt-auto flex gap-2">
                  <Skeleton className="h-4 w-20 bg-surface-muted/80" />
                  <Skeleton className="h-4 w-16 bg-surface-muted/80" />
                </div>
              </div>
              <Skeleton className="size-20 rounded-card bg-surface-muted/80" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function TransactionsPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface" aria-busy="true">
      <header className="px-4 py-3">
        <Skeleton className="h-11 w-full rounded-card bg-surface-muted/80" />
      </header>
      <main className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
        <div className="grid gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <RiseSkeleton
              key={index}
              delay={index * 60}
              className="grid min-h-32 gap-4 rounded-panel border border-border bg-surface p-4 shadow-low"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-2">
                  <Skeleton className="h-6 w-32 bg-surface-muted/80" />
                  <Skeleton className="h-4 w-36 bg-surface-muted/80" />
                </div>
                <div className="flex items-center pl-2">
                  {Array.from({ length: 3 }, (_, imageIndex) => (
                    <Skeleton
                      key={imageIndex}
                      className={`size-12 rounded-card border-2 border-white bg-surface-muted/80 shadow-low ${
                        imageIndex ? "-ml-3" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-auto flex items-end justify-between gap-3">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-52 bg-surface-muted/80" />
                  <Skeleton className="h-3.5 w-28 bg-surface-muted/80" />
                </div>
                <Skeleton className="size-8 rounded-full bg-surface-muted/80" />
              </div>
              <LoadingSheen delay={index * 60} />
            </RiseSkeleton>
          ))}
        </div>
      </main>
    </div>
  );
}

export function StockPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface" aria-busy="true">
      <header className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 min-w-0 flex-1 rounded-card bg-surface-muted/80" />
          <Skeleton className="size-11 shrink-0 rounded-full bg-accent/20" />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden bg-app-bg p-4">
        <div className="grid w-full gap-8">
          {[3, 6].map((rowCount, sectionIndex) => (
            <section key={rowCount}>
              <div className="flex items-center justify-between gap-3">
                <Skeleton className={`h-5 bg-surface-muted/80 ${sectionIndex ? "w-32" : "w-28"}`} />
                {!sectionIndex && <Skeleton className="h-7 w-16 rounded-full bg-danger-soft/70" />}
              </div>
              <div className="mt-4 grid gap-3">
                {Array.from({ length: rowCount }, (_, index) => (
                  <RiseSkeleton
                    key={index}
                    delay={(sectionIndex * 3 + index) * 60}
                    className="min-h-24 rounded-panel bg-surface p-4 shadow-low"
                  >
                    {sectionIndex ? (
                      <div className="grid h-full grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3">
                        <Skeleton className="size-12 rounded-card bg-surface-muted/80" />
                        <div className="grid gap-2">
                          <Skeleton className="h-4 w-3/4 bg-surface-muted/80" />
                          <Skeleton className="h-3.5 w-1/2 bg-surface-muted/80" />
                        </div>
                        <div className="grid justify-items-end gap-2">
                          <Skeleton className="h-5 w-10 bg-surface-muted/80" />
                          <Skeleton className="h-3 w-14 bg-surface-muted/80" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid h-full gap-4">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                          <div className="grid gap-2">
                            <Skeleton className="h-4 w-3/4 bg-surface-muted/80" />
                            <Skeleton className="h-3.5 w-1/2 bg-surface-muted/80" />
                          </div>
                          <div className="grid justify-items-end gap-2">
                            <Skeleton className="h-5 w-10 bg-surface-muted/80" />
                            <Skeleton className="h-3 w-14 bg-surface-muted/80" />
                          </div>
                        </div>
                        <Skeleton className="h-2 w-full rounded-full bg-surface-muted/80" />
                      </div>
                    )}
                    <LoadingSheen delay={(sectionIndex * 3 + index) * 60} />
                  </RiseSkeleton>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface" aria-busy="true">
      <main className="settings-workspace min-h-0 flex-1 overflow-auto">
        <div className="settings-workspace-layout">
          <div className="settings-navigation">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton
                key={index}
                className={`settings-navigation-item rounded-control bg-surface-muted/80 ${index === 0 ? "w-28" : "w-24"}`}
              />
            ))}
          </div>

          <div className="settings-content mx-auto w-full max-w-3xl">
            <Panel className="master-data-manager">
              <div className="p-4">
                <Skeleton className="h-4 w-24 bg-surface-muted/80" />
                <Skeleton className="mt-2 h-3.5 w-full max-w-80 bg-surface-muted/80" />
              </div>

              <div className="master-data-create p-4">
                <div className="grid gap-2">
                  <Skeleton className="h-3.5 w-24 bg-surface-muted/80" />
                  <Skeleton className="h-9 w-full rounded-card bg-surface-muted/80" />
                </div>
                <div className="master-data-actions-single">
                  <div className="settings-touch-target flex items-center justify-center">
                    <Skeleton className="h-9 w-20 rounded-control bg-surface-muted/80" />
                  </div>
                </div>
              </div>

              <div>
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="master-data-item-row min-h-13 px-4 py-1">
                    <Skeleton className={`h-4 bg-surface-muted/80 ${index === 1 ? "w-2/5" : "w-1/3"}`} />
                    <Skeleton className="settings-touch-target size-11 rounded-control bg-surface-muted/80" />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}
