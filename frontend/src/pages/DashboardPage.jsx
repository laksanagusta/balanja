import React from "react";
import DashboardKpiCard from "../components/dashboard/DashboardKpiCard.jsx";
import { RevenueTrendPanel, TopProductsPanel } from "../components/dashboard/DashboardCharts.jsx";
import LowStockPanel from "../components/dashboard/LowStockPanel.jsx";
import BackgroundUpdateStatus from "../components/feedback/BackgroundUpdateStatus.jsx";
import { DashboardPageSkeleton } from "../components/page-loading.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice, routes } from "../shared.jsx";

const periods = [
  { value: 1, label: "Hari ini" },
  { value: 7, label: "7 hari" },
  { value: 30, label: "30 hari" },
];
const emptyAnalytics = {
  revenue: 0,
  transactionCount: 0,
  averageTransactionValue: 0,
  lowStockCount: 0,
  comparisons: {
    revenue: { direction: "neutral", percent: null },
    transactions: { direction: "neutral", percent: null },
    average: { direction: "neutral", percent: null },
  },
  revenueTrend: [],
  topProducts: [],
  lowStock: [],
};

export default function DashboardPage({ onNavigate }) {
  const store = usePOSStore();
  const { settings, getDashboardSummary, setNotice } = store;
  const [days, setDays] = React.useState(1);
  const [analytics, setAnalytics] = React.useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = React.useState(true);
  const periodPillRef = React.useRef(null);
  const periodItemRefs = React.useRef(new Map());

  const updatePeriodPill = React.useCallback(() => {
    const pill = periodPillRef.current;
    const target = periodItemRefs.current.get(days);
    if (!pill || !target) return;
    pill.style.transform = `translateX(${target.offsetLeft}px)`;
    pill.style.width = `${target.offsetWidth}px`;
  }, [days]);

  const visibleAnalytics = analytics ?? emptyAnalytics;
  const shouldShowSkeleton = isSummaryLoading && !analytics;
  const isUpdatingSummary = isSummaryLoading && Boolean(analytics);
  const comparisonContext = days === 1 ? "vs kemarin pada jam yang sama" : "vs periode sebelumnya";

  React.useLayoutEffect(() => {
    updatePeriodPill();
  }, [updatePeriodPill, shouldShowSkeleton]);

  React.useEffect(() => {
    window.addEventListener("resize", updatePeriodPill);
    return () => window.removeEventListener("resize", updatePeriodPill);
  }, [updatePeriodPill]);

  React.useEffect(() => {
    const controller = new AbortController();
    store.loadSettings({ force: true, signal: controller.signal });
    return () => controller.abort();
  }, [store.loadSettings]);

  React.useEffect(() => {
    const controller = new AbortController();
    setIsSummaryLoading(true);
    getDashboardSummary({ days, signal: controller.signal })
      .then(setAnalytics)
      .catch((error) => {
        if (error.code !== "REQUEST_TIMEOUT") setNotice(error.message || "Gagal memuat dashboard");
        setAnalytics(emptyAnalytics);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSummaryLoading(false);
      });
    return () => controller.abort();
  }, [days, getDashboardSummary, setNotice]);

  if (shouldShowSkeleton) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="h-full overflow-auto bg-app-bg">
      <main className="grid gap-4 p-4" aria-busy={isSummaryLoading}>
        <section className="flex flex-wrap items-center justify-between gap-3" aria-label="Periode ringkasan">
          <p className="min-w-0 truncate text-sm font-semibold text-text">
            Performa {settings.storeName || "toko"}
          </p>
          <div className="flex items-center gap-2">
            <BackgroundUpdateStatus active={isUpdatingSummary} label="Memperbarui ringkasan dashboard" />
            <div className="relative z-0 inline-flex w-fit rounded-full border border-border bg-surface-muted p-1" aria-label="Periode dashboard">
              <span
                ref={periodPillRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-1 left-0 -z-10 rounded-full bg-surface transition-[transform,width] duration-base ease-standard motion-reduce:transition-none"
              />
              {periods.map(({ value, label }) => (
                <button
                  key={value}
                  ref={(node) => {
                    if (node) periodItemRefs.current.set(value, node);
                    else periodItemRefs.current.delete(value);
                  }}
                  type="button"
                  aria-pressed={days === value}
                  onClick={() => setDays(value)}
                  className={`h-8 rounded-full px-3 text-xs font-semibold transition active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    days === value ? "text-text" : "text-text-muted hover:text-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indikator kinerja utama">
          <div className="min-w-0 sm:col-span-2 xl:col-span-2">
            <DashboardKpiCard label="Pendapatan" value={formatPrice(visibleAnalytics.revenue)} comparison={visibleAnalytics.comparisons.revenue} comparisonContext={comparisonContext} emphasis />
          </div>
          <DashboardKpiCard label="Transaksi selesai" value={visibleAnalytics.transactionCount.toLocaleString("id-ID")} comparison={visibleAnalytics.comparisons.transactions} comparisonContext={comparisonContext} />
          <DashboardKpiCard label="Rata-rata transaksi" value={formatPrice(visibleAnalytics.averageTransactionValue)} comparison={visibleAnalytics.comparisons.average} comparisonContext={comparisonContext} />
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-4 xl:col-start-9 xl:row-start-1">
            <LowStockPanel
              products={visibleAnalytics.lowStock}
              onManageStock={() => onNavigate(routes.stock)}
            />
          </div>
          <div className="min-w-0 xl:col-span-8 xl:col-start-1 xl:row-start-1">
            <RevenueTrendPanel data={visibleAnalytics.revenueTrend} hasData={visibleAnalytics.transactionCount > 0} days={days} />
          </div>
        </section>

        <TopProductsPanel
          data={visibleAnalytics.topProducts}
          onViewReport={() => onNavigate(routes.reportsSales)}
        />
      </main>
    </div>
  );
}
