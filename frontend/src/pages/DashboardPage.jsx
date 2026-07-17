import React from "react";
import DashboardKpiCard from "../components/dashboard/DashboardKpiCard.jsx";
import { PaymentMixPanel, RevenueTrendPanel, TopProductsPanel } from "../components/dashboard/DashboardCharts.jsx";
import LowStockPanel from "../components/dashboard/LowStockPanel.jsx";
import { DashboardPageSkeleton } from "../components/page-loading.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice, routes } from "../shared.jsx";

const periods = [7, 30];
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
  paymentMix: [],
  topProducts: [],
  lowStock: [],
};

export default function DashboardPage({ onNavigate }) {
  const store = usePOSStore();
  const { settings, getDashboardSummary, setNotice } = store;
  const [days, setDays] = React.useState(7);
  const [analytics, setAnalytics] = React.useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = React.useState(true);

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

  const visibleAnalytics = analytics ?? emptyAnalytics;
  const shouldShowSkeleton = isSummaryLoading && !analytics;
  const isUpdatingSummary = isSummaryLoading && Boolean(analytics);

  if (shouldShowSkeleton) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="h-full overflow-auto bg-app-bg">
      <header className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-text">Dashboard</h1>
          <p className="mt-0.5 truncate text-xs text-text-muted">Ringkasan performa toko {settings.storeName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isUpdatingSummary && <UpdatingBadge />}
          <div className="inline-flex w-fit rounded-control border border-border bg-surface-muted p-1" aria-label="Periode dashboard">
            {periods.map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={days === period}
                onClick={() => setDays(period)}
                className={`h-8 rounded-md px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  days === period ? "bg-surface text-text shadow-low" : "text-text-muted hover:text-text"
                }`}
              >
                {period} hari
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className={`grid gap-4 p-4 ${isUpdatingSummary ? "opacity-60 transition-opacity duration-base ease-standard" : "transition-opacity duration-base ease-standard"}`}>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indikator kinerja utama">
          <DashboardKpiCard label="Pendapatan" value={formatPrice(visibleAnalytics.revenue)} icon="cash" comparison={visibleAnalytics.comparisons.revenue} tone="success" />
          <DashboardKpiCard label="Transaksi selesai" value={visibleAnalytics.transactionCount.toLocaleString("id-ID")} icon="receipt" comparison={visibleAnalytics.comparisons.transactions} />
          <DashboardKpiCard label="Rata-rata transaksi" value={formatPrice(visibleAnalytics.averageTransactionValue)} icon="ticket" comparison={visibleAnalytics.comparisons.average} />
          <DashboardKpiCard label="Stok menipis" value={visibleAnalytics.lowStockCount.toLocaleString("id-ID")} icon="package" tone={visibleAnalytics.lowStockCount ? "warning" : "success"} supportingText={visibleAnalytics.lowStockCount ? "Perlu restok" : "Level stok terlihat sehat"} />
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8 grid grid-rows-1">
            <RevenueTrendPanel data={visibleAnalytics.revenueTrend} hasData={visibleAnalytics.transactionCount > 0} days={days} />
          </div>
          <div className="min-w-0 xl:col-span-4 grid grid-rows-1">
            <PaymentMixPanel data={visibleAnalytics.paymentMix} />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-7 grid grid-rows-1">
            <TopProductsPanel data={visibleAnalytics.topProducts} />
          </div>
          <div className="min-w-0 xl:col-span-5 grid grid-rows-1">
            <LowStockPanel
              products={visibleAnalytics.lowStock}
              onManageStock={() => onNavigate(routes.stock)}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function UpdatingBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-control border border-border bg-surface-muted px-2.5 text-xs font-semibold text-text-muted">
      <span className="size-1.5 animate-pulse rounded-full bg-accent" />
      Memperbarui
    </span>
  );
}
