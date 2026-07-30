import React from "react";
import { LineChart, Line } from "../charts/line-chart.jsx";
import { Grid } from "../charts/grid.jsx";
import { XAxis } from "../charts/x-axis.jsx";
import { ChartTooltip, TooltipContent } from "../charts/tooltip/index.js";
import { EmptyState } from "../feedback/EmptyState.jsx";
import { Button, Panel } from "../primitives.jsx";
import { formatPrice } from "../../shared.jsx";
import { localizedTrendTitle } from "../charts/trend-tooltip-title.js";

function ChartPanel({ title, description, badge, children, className = "" }) {
  return (
    <Panel className={`min-w-0 overflow-hidden p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p> : null}
        </div>
        {badge ? <span className="shrink-0 rounded-full bg-success-soft px-2 py-1 text-[11px] font-semibold text-success">{badge}</span> : null}
      </div>
      {children}
    </Panel>
  );
}

function ChartEmpty({ title, description }) {
  return <EmptyState icon={null} title={title} description={description} className="mt-4 min-h-[230px]" />;
}

function RevenueTrendTooltip({ point }) {
  return (
    <TooltipContent
      title={localizedTrendTitle(point)}
      rows={[{
        label: "Pendapatan",
        value: formatPrice(point.revenue),
        color: "var(--chart-line-primary)",
      }]}
    />
  );
}

export function RevenueTrendPanel({ data, hasData, days }) {
  const periodLabel = days === 1 ? "Hari ini" : `${days} hari`;

  return (
    <ChartPanel title="Tren pendapatan" badge={periodLabel} className="h-full">
      {hasData ? (
        <LineChart data={data} xDataKey="date" xLabelKey="label" aspectRatio={null} className="mt-3 h-[250px] md:h-[280px]" margin={{ top: 24, right: 18, bottom: 42, left: 18 }}>
          <Grid horizontal numTicksRows={4} fadeHorizontal={false} />
          <Line dataKey="revenue" stroke="var(--chart-line-primary)" strokeWidth={2.5} showMarkers={data.length < 3} />
          <XAxis numTicks={days === 30 || days === 1 ? 6 : 7} />
          <ChartTooltip showDatePill={false} content={({ point }) => <RevenueTrendTooltip point={point} />} />
        </LineChart>
      ) : (
        <ChartEmpty title="Belum ada penjualan di periode ini" description="Transaksi yang selesai akan mengisi tren pendapatan secara otomatis." />
      )}
    </ChartPanel>
  );
}

export function TopProductsPanel({ data, onViewReport }) {
  return (
    <ChartPanel title="Produk terlaris">
      {data.length ? (
        <ol className="mt-3">
          {data.map((item, index) => (
            <li key={item.productId} className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
              <span className="font-mono text-xs font-semibold text-text-subtle tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{item.label}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  <span className="font-mono tabular-nums">{Number(item.quantity).toLocaleString("id-ID")}</span> unit terjual
                </p>
              </div>
              <span className="max-w-32 break-words text-right font-mono text-sm font-semibold text-text tabular-nums">
                {formatPrice(item.revenue)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ChartEmpty title="Belum ada produk terjual" description="Peringkat produk akan muncul seiring bertambahnya transaksi selesai." />
      )}
      {onViewReport ? (
        <Button type="button" variant="secondary" className="mt-4 w-full" onClick={onViewReport}>
          Lihat laporan penjualan
        </Button>
      ) : null}
    </ChartPanel>
  );
}
