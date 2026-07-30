import React from "react";
import { Panel } from "../primitives.jsx";

function comparisonLabel(comparison, comparisonContext) {
  if (!comparison || comparison.percent === null) return "Belum ada data periode sebelumnya";
  const arrow = comparison.direction === "up" ? "↑" : comparison.direction === "down" ? "↓" : "→";
  return `${arrow} ${Math.abs(comparison.percent).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% ${comparisonContext}`;
}

export default function DashboardKpiCard({
  label,
  value,
  comparison,
  comparisonContext = "vs periode sebelumnya",
  emphasis = false,
}) {
  const comparisonTone = comparison?.direction === "up" ? "text-success" : comparison?.direction === "down" ? "text-danger" : "text-text-muted";

  return (
    <Panel className={`min-w-0 ${emphasis ? "p-5" : "p-4"}`}>
      <p className="text-xs font-semibold text-text-muted">{label}</p>
      <p className={`mt-4 break-words font-mono font-semibold tracking-tight text-text tabular-nums ${emphasis ? "text-3xl" : "text-2xl"}`}>
        {value}
      </p>
      <p className={`mt-1.5 text-[11px] font-semibold leading-4 ${comparisonTone}`}>
        {comparisonLabel(comparison, comparisonContext)}
      </p>
    </Panel>
  );
}
