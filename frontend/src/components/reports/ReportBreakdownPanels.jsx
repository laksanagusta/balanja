import React from "react";
import { EmptyState } from "../feedback/EmptyState.jsx";
import { Badge, DataTable, Panel } from "../primitives.jsx";
import { cashierLabel } from "../../reports/report-utils.js";

function ReportTablePanel({ title, description, columns, data, emptyTitle }) {
  return (
    <Panel className="min-w-0 overflow-hidden">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        <p className="mt-1 text-xs text-text-muted">{description}</p>
      </div>
      {data.length ? <DataTable columns={columns} data={data} /> : <EmptyState icon="table" title={emptyTitle} className="m-4 min-h-[180px]" />}
    </Panel>
  );
}

export function VoidReportPanel({ voids = {}, formatMoney, formatCount }) {
  return (
    <Panel className="flex flex-wrap items-center justify-between gap-4 border-danger/20 bg-danger-soft/30 p-4 shadow-none">
      <div>
        <h2 className="text-sm font-semibold text-text">Transaksi void</h2>
        <p className="mt-1 text-xs text-text-muted">Dipisahkan dari seluruh metrik penjualan selesai.</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone="danger">{formatCount(voids.count || 0)} transaksi</Badge>
        <span className="font-mono text-sm font-semibold tabular-nums text-danger">{formatMoney(voids.originalValue || 0)}</span>
      </div>
    </Panel>
  );
}

export default function ReportBreakdownPanels({ products = [], payments = [], cashiers = [], voids = {}, showVoids = true, formatMoney, formatCount }) {
  return (
    <>
      {showVoids && <VoidReportPanel voids={voids} formatMoney={formatMoney} formatCount={formatCount} />}
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportTablePanel
          title="Produk teratas"
          description="Nilai produk memakai harga snapshot × kuantitas, tanpa alokasi pajak transaksi."
          data={products}
          emptyTitle="Belum ada produk terjual"
          columns={[
            { key: "label", label: "Produk" },
            { key: "quantity", label: "Item terjual", align: "right", render: (row) => formatCount(row.quantity) },
            { key: "netSales", label: "Penjualan bersih", align: "right", render: (row) => <span className="font-mono tabular-nums">{formatMoney(row.netSales)}</span> },
          ]}
        />
        <ReportTablePanel
          title="Metode pembayaran"
          description="Transaksi selesai dan total diterima per metode."
          data={payments}
          emptyTitle="Belum ada metode pembayaran"
          columns={[
            { key: "paymentMethod", label: "Metode", render: (row) => row.paymentMethod === "cash" ? "Tunai" : row.paymentMethod.toUpperCase() },
            { key: "transactionCount", label: "Transaksi", align: "right", render: (row) => formatCount(row.transactionCount) },
            { key: "totalReceived", label: "Total diterima", align: "right", render: (row) => <span className="font-mono tabular-nums">{formatMoney(row.totalReceived)}</span> },
          ]}
        />
      </div>
      <ReportTablePanel
        title="Kinerja kasir"
        description="Ringkasan transaksi selesai berdasarkan snapshot identitas kasir."
        data={cashiers}
        emptyTitle="Belum ada aktivitas kasir"
        columns={[
          { key: "cashier", label: "Kasir", render: (row) => cashierLabel(row.cashierName || row.label, row.cashierUserId) },
          { key: "completedTransactions", label: "Transaksi", align: "right", render: (row) => formatCount(row.completedTransactions) },
          { key: "itemsSold", label: "Item", align: "right", render: (row) => formatCount(row.itemsSold) },
          { key: "netSales", label: "Bersih", align: "right", render: (row) => formatMoney(row.netSales) },
          { key: "tax", label: "Pajak", align: "right", render: (row) => formatMoney(row.tax) },
          { key: "totalReceived", label: "Diterima", align: "right", render: (row) => <span className="font-mono font-semibold tabular-nums">{formatMoney(row.totalReceived)}</span> },
        ]}
      />
    </>
  );
}
