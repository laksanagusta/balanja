import React from "react";
import DashboardKpiCard from "../dashboard/DashboardKpiCard.jsx";
import { PaymentMixPanel, RevenueTrendPanel, TopProductsPanel } from "../dashboard/DashboardCharts.jsx";

const revenueTrend = [82, 104, 96000, 128, 118, 151, 173].map((value, index) => ({
  date: new Date(2026, 6, 4 + index),
  label: `${4 + index} Jul`,
  revenue: value < 1000 ? value * 1000 : value,
}));

const paymentMix = [
  { label: "Cash", value: 456000, percentage: 58, color: "var(--color-chart-cash)" },
  { label: "QRIS", value: 304000, percentage: 38.7, color: "var(--color-chart-qris)" },
  { label: "Other", value: 26000, percentage: 3.3, color: "var(--color-chart-other)" },
];

const topProducts = [
  { productId: "noodle", label: "Mie Instan", quantity: 42, revenue: 147000 },
  { productId: "water", label: "Air Mineral", quantity: 31, revenue: 124000 },
  { productId: "sugar", label: "Gula Pasir", quantity: 18, revenue: 315000 },
  { productId: "soap", label: "Sabun Mandi", quantity: 14, revenue: 77000 },
  { productId: "rice", label: "Beras Ramos", quantity: 9, revenue: 648000 },
];

export default function DashboardPatternsShowcase() {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Dashboard patterns</h3>
      <div className="grid gap-4 rounded-panel border border-border bg-app-bg p-4">
        <p className="text-sm leading-6 text-text-muted">Production BKLIT chart components using Balanja semantic tokens and compact operational panels.</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard label="Revenue" value="Rp786.000" icon="cash" comparison={{ direction: "up", percent: 12.4 }} tone="success" />
          <DashboardKpiCard label="Completed transactions" value="28" icon="receipt" comparison={{ direction: "up", percent: 7.7 }} />
          <DashboardKpiCard label="Average transaction" value="Rp28.071" icon="ticket" comparison={{ direction: "down", percent: -2.3 }} />
          <DashboardKpiCard label="Low-stock products" value="3" icon="package" tone="warning" supportingText="Needs restocking attention" />
        </div>
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8"><RevenueTrendPanel data={revenueTrend} hasData days={7} /></div>
          <div className="min-w-0 xl:col-span-4"><PaymentMixPanel data={paymentMix} /></div>
        </div>
        <TopProductsPanel data={topProducts} />
      </div>
    </div>
  );
}
