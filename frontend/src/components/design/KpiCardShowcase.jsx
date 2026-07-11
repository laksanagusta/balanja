import React from "react";
import { Icon } from "../primitives.jsx";

const kpis = [
  {
    label: "Total Revenue",
    value: "$ 12,840",
    change: "+12.5%",
    trend: "up",
    icon: "cash",
    iconBg: "bg-success-soft text-success",
  },
  {
    label: "Orders Today",
    value: "156",
    change: "+8.2%",
    trend: "up",
    icon: "receipt",
    iconBg: "bg-accent-soft text-accent",
  },
  {
    label: "Avg. Order Value",
    value: "$ 82.30",
    change: "+3.7%",
    trend: "up",
    icon: "bag",
    iconBg: "bg-accent-soft text-accent",
  },
  {
    label: "Items Sold",
    value: "423",
    change: "+15.1%",
    trend: "up",
    icon: "box",
    iconBg: "bg-success-soft text-success",
  },
  {
    label: "Active Tables",
    value: "8 / 12",
    change: "4 available",
    trend: "neutral",
    icon: "grid",
    iconBg: "bg-surface-muted text-text-muted",
  },
  {
    label: "Pending Orders",
    value: "3",
    change: "-2 from peak",
    trend: "down",
    icon: "clock",
    iconBg: "bg-warning-soft text-warning",
  },
];

const trendColors = {
  up: "text-success",
  down: "text-danger",
  neutral: "text-text-muted",
};

export default function KpiCardShowcase() {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">KPI cards</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-4 text-sm text-text-muted">Metric cards for dashboard and shift overview.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-card border border-border bg-surface p-4 shadow-low"
            >
              <div className="flex items-center justify-between">
                <span className={`flex size-9 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                  <Icon name={kpi.icon} className="size-4" />
                </span>
                <span className={`text-xs font-semibold ${trendColors[kpi.trend]}`}>
                  {kpi.change}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-text">{kpi.value}</p>
              <p className="mt-0.5 text-xs font-medium text-text-muted">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
