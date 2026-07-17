import React from "react";
import { Panel } from "../primitives.jsx";

const toneClasses = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-muted text-text-muted",
};

function comparisonLabel(comparison) {
  if (!comparison || comparison.percent === null) return "Belum ada data periode sebelumnya";
  const arrow = comparison.direction === "up" ? "↑" : comparison.direction === "down" ? "↓" : "→";
  return `${arrow} ${Math.abs(comparison.percent).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% vs periode sebelumnya`;
}

export default function DashboardKpiCard({ label, value, comparison, tone = "neutral", supportingText }) {
  const comparisonTone = comparison?.direction === "up" ? "text-success" : comparison?.direction === "down" ? "text-danger" : "text-text-muted";

  return (
    <Panel className="min-w-0 p-4 shadow-low">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-text-muted">{label}</p>

      </div>
      <p className="mt-4 truncate font-mono text-2xl font-semibold tracking-tight text-text tabular-nums">{value}</p>
      <p className={`mt-1.5 truncate text-[11px] font-semibold ${supportingText ? "text-text-muted" : comparisonTone}`}>
        {supportingText || comparisonLabel(comparison)}
      </p>
    </Panel>
  );
}
