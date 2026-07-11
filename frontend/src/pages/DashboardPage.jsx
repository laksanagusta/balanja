import React from "react";
import DashboardKpiCard from "../components/dashboard/DashboardKpiCard.jsx";
import { PaymentMixPanel, RevenueTrendPanel, TopProductsPanel } from "../components/dashboard/DashboardCharts.jsx";
import LowStockPanel from "../components/dashboard/LowStockPanel.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";

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

export default function DashboardPage() {
  const { settings, getDashboardSummary, setNotice } = usePOSStore();
  const [days, setDays] = React.useState(7);
  const [analytics, setAnalytics] = React.useState(emptyAnalytics);

  React.useEffect(() => {
    const controller = new AbortController();
    getDashboardSummary({ days, signal: controller.signal })
      .then(setAnalytics)
      .catch((error) => {
        if (error.code !== "REQUEST_TIMEOUT") setNotice(error.message || "Failed to load dashboard");
      });
    return () => controller.abort();
  }, [days, getDashboardSummary, setNotice]);

  return (
    <div className="h-full overflow-auto bg-app-bg">
      <header className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-text">Dashboard</h1>
          <p className="mt-0.5 truncate text-xs text-text-muted">Operational overview for {settings.storeName}</p>
        </div>
        <div className="inline-flex w-fit rounded-control border border-border bg-surface-muted p-1" aria-label="Dashboard period">
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
              {period} days
            </button>
          ))}
        </div>
      </header>

      <main className="grid gap-4 p-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key performance indicators">
          <DashboardKpiCard label="Revenue" value={formatPrice(analytics.revenue)} icon="cash" comparison={analytics.comparisons.revenue} tone="success" />
          <DashboardKpiCard label="Completed transactions" value={analytics.transactionCount.toLocaleString("id-ID")} icon="receipt" comparison={analytics.comparisons.transactions} />
          <DashboardKpiCard label="Average transaction" value={formatPrice(analytics.averageTransactionValue)} icon="ticket" comparison={analytics.comparisons.average} />
          <DashboardKpiCard label="Low-stock products" value={analytics.lowStockCount.toLocaleString("id-ID")} icon="package" tone={analytics.lowStockCount ? "warning" : "success"} supportingText={analytics.lowStockCount ? "Needs restocking attention" : "Inventory levels look healthy"} />
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8 grid grid-rows-1">
            <RevenueTrendPanel data={analytics.revenueTrend} hasData={analytics.transactionCount > 0} days={days} />
          </div>
          <div className="min-w-0 xl:col-span-4 grid grid-rows-1">
            <PaymentMixPanel data={analytics.paymentMix} />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-7 grid grid-rows-1">
            <TopProductsPanel data={analytics.topProducts} />
          </div>
          <div className="min-w-0 xl:col-span-5 grid grid-rows-1">
            <LowStockPanel products={analytics.lowStock} />
          </div>
        </section>
      </main>
    </div>
  );
}
