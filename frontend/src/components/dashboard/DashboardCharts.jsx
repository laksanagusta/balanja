import React from "react";
import { LineChart, Line } from "../charts/line-chart.jsx";
import { Grid } from "../charts/grid.jsx";
import { XAxis } from "../charts/x-axis.jsx";
import { ChartTooltip, TooltipContent } from "../charts/tooltip/index.js";
import { PieChart } from "../charts/pie-chart.jsx";
import PieSlice from "../charts/pie-slice.jsx";
import { PieCenter } from "../charts/pie-center.jsx";
import { BarChart } from "../charts/bar-chart.jsx";
import { Bar } from "../charts/bar.jsx";
import { BarXAxis } from "../charts/bar-x-axis.jsx";
import { EmptyState } from "../feedback/EmptyState.jsx";
import { Panel } from "../primitives.jsx";
import { formatPrice } from "../../shared.jsx";
import { localizedTrendTitle } from "../charts/trend-tooltip-title.js";

function ChartPanel({ title, description, badge, children, className = "" }) {
  return (
    <Panel className={`min-w-0 overflow-hidden p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
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
  return (
    <ChartPanel title="Tren pendapatan" description={`Pendapatan transaksi selesai per hari dalam ${days} hari terakhir.`} badge={`${days} hari`}>
      {hasData ? (
        <LineChart data={data} xDataKey="date" xLabelKey="label" aspectRatio={null} className="mt-3 h-[250px] md:h-[280px]" margin={{ top: 24, right: 18, bottom: 42, left: 18 }}>
          <Grid horizontal numTicksRows={4} fadeHorizontal={false} />
          <Line dataKey="revenue" stroke="var(--chart-line-primary)" strokeWidth={2.5} showMarkers />
          <XAxis numTicks={days === 30 ? 6 : 7} />
          <ChartTooltip showDatePill={false} content={({ point }) => <RevenueTrendTooltip point={point} />} />
        </LineChart>
      ) : (
        <ChartEmpty title="Belum ada penjualan di periode ini" description="Transaksi yang selesai akan mengisi tren pendapatan secara otomatis." />
      )}
    </ChartPanel>
  );
}

export function PaymentMixPanel({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartPanel title="Metode pembayaran" description="Distribusi pendapatan transaksi selesai berdasarkan metode pembayaran.">
      {data.length ? (
        <div className="mt-3 grid justify-items-center gap-3">
          <PieChart data={data} size={230} innerRadius={68} padAngle={0.035} cornerRadius={5} hoverOffset={5}>
            {data.map((item, index) => (
              <PieSlice key={item.label} index={index} color={item.color} showGlow={false} hoverEffect="grow" hoverOffset={4} />
            ))}
            <PieCenter defaultLabel="Pendapatan" formatOptions={{ notation: "compact", maximumFractionDigits: 1 }} prefix="Rp" />
          </PieChart>
          <div className="grid w-full gap-2">
            {data.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-text-muted">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: item.color }} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 font-mono font-semibold text-text tabular-nums">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
          <p className="sr-only">Total pendapatan pembayaran {formatPrice(total)}</p>
        </div>
      ) : (
        <ChartEmpty title="Belum ada data pembayaran" description="Distribusi metode pembayaran akan muncul setelah transaksi selesai pertama." />
      )}
    </ChartPanel>
  );
}

function shortLabel(label) {
  return label.length > 15 ? `${label.slice(0, 13)}…` : label;
}

export function TopProductsPanel({ data }) {
  const chartData = data.map((item) => ({ ...item, chartLabel: shortLabel(item.label) }));

  return (
    <ChartPanel title="Produk terlaris" description="Lima produk dengan jumlah unit terjual tertinggi pada periode ini.">
      {data.length ? (
        <BarChart data={chartData} xDataKey="chartLabel" aspectRatio="2.05 / 1" className="mt-3 min-h-[250px]" margin={{ top: 24, right: 18, bottom: 42, left: 18 }} barGap={0.38}>
          <Grid horizontal numTicksRows={4} fadeHorizontal={false} />
          <Bar dataKey="quantity" fill="var(--chart-bar-primary)" lineCap="round" />
          <BarXAxis showAllLabels tickerHalfWidth={42} />
          <ChartTooltip />
        </BarChart>
      ) : (
        <ChartEmpty title="Belum ada produk terjual" description="Peringkat produk akan muncul seiring bertambahnya transaksi selesai." />
      )}
    </ChartPanel>
  );
}
