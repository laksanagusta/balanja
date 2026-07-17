import React from "react";
import { Panel } from "../primitives.jsx";
import { comparisonCopy } from "../../reports/report-utils.js";

export default function ReportMetricCard({ label, value, comparison, formatAbsolute = String }) {
  const directionClass = comparison?.direction === "up" ? "text-success" : comparison?.direction === "down" ? "text-danger" : "text-text-muted";
  return (
    <Panel className="grid min-w-0 gap-3 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle">{label}</p>
      <p className="truncate font-mono text-2xl font-semibold tabular-nums text-text">{value}</p>
      <div className="grid gap-1 text-xs">
        <p className={`font-semibold ${directionClass}`}>{comparisonCopy(comparison)}</p>
        {comparison && <p className="text-text-muted">Selisih {formatAbsolute(comparison.absolute)}</p>}
      </div>
    </Panel>
  );
}
