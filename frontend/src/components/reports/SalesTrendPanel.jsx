import React from "react";
import { LineChart, Line } from "../charts/line-chart.jsx";
import { Grid } from "../charts/grid.jsx";
import { XAxis } from "../charts/x-axis.jsx";
import { ChartTooltip, TooltipContent } from "../charts/tooltip/index.js";
import { EmptyState } from "../feedback/EmptyState.jsx";
import { Panel } from "../primitives.jsx";
import { alignTrend } from "../../reports/report-utils.js";
import { formatPrice } from "../../shared.jsx";

const trendDateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

function formatTrendDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "" : trendDateFormatter.format(date);
}

function ReportTrendTooltip({ point }) {
  return (
    <TooltipContent
      title={formatTrendDate(point.date)}
      rows={[
        { label: "Periode ini", value: formatPrice(point.current), color: "var(--chart-line-primary)" },
        { label: "Periode sebelumnya", value: formatPrice(point.previous), color: "var(--color-text-muted)" },
      ]}
    />
  );
}

export default function SalesTrendPanel({ current = [], previous = [] }) {
  const data = alignTrend(current, previous);
  return (
    <Panel className="min-w-0 overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Tren total diterima</h2>
          <p className="mt-1 text-xs text-text-muted">Periode terpilih dibanding periode sebelumnya yang sama panjang.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-text-muted" aria-label="Legenda tren">
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-[var(--chart-line-primary)]" />Periode ini</span>
          <span className="inline-flex items-center gap-2"><span className="h-px w-5 border-t border-dashed border-text-muted" />Periode sebelumnya</span>
        </div>
      </div>
      {data.some((point) => point.current || point.previous) ? (
        <LineChart data={data} xDataKey="date" aspectRatio="2.8 / 1" className="mt-4 min-h-[260px]" margin={{ top: 24, right: 18, bottom: 42, left: 18 }}>
          <Grid horizontal numTicksRows={4} fadeHorizontal={false} />
          <Line dataKey="current" stroke="var(--chart-line-primary)" strokeWidth={2.5} />
          <Line dataKey="previous" stroke="var(--color-text-muted)" strokeWidth={1.75} dashFromIndex={0} />
          <XAxis numTicks={Math.min(data.length, 7)} />
          <ChartTooltip showDots={false} showDatePill={false} content={({ point }) => <ReportTrendTooltip point={point} />} />
        </LineChart>
      ) : (
        <EmptyState icon="cash" title="Belum ada penjualan" description="Tren akan muncul setelah ada transaksi selesai pada periode ini." className="mt-4 min-h-[240px]" />
      )}
    </Panel>
  );
}
