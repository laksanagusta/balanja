import React from "react";
import { Badge, DataTable } from "../primitives.jsx";
import { transactionData, inventoryData } from "../../data.js";

export default function DataTableShowcase() {
  const [sortKey, setSortKey] = React.useState("time");
  const [sortDir, setSortDir] = React.useState("desc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...transactionData].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (a[sortKey] < b[sortKey]) return -1 * dir;
    if (a[sortKey] > b[sortKey]) return 1 * dir;
    return 0;
  });

  const statusBadge = (status) => {
    const tone = status === "completed" ? "success" : status === "refunded" ? "warning" : "danger";
    return <Badge tone={tone}>{status}</Badge>;
  };

  const transactionCols = [
    { key: "id", label: "ID", sortable: true },
    { key: "time", label: "Time", sortable: true },
    { key: "items", label: "Items", sortable: true },
    {
      key: "total",
      label: "Total",
      sortable: true,
      render: (row) => (
        <span className="font-mono font-semibold tabular-nums">$ {row.total.toFixed(2)}</span>
      ),
    },
    { key: "payment", label: "Payment", sortable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => statusBadge(row.status),
    },
    { key: "cashier", label: "Cashier", sortable: true },
  ];

  const inventoryCols = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Item" },
    { key: "category", label: "Category" },
    {
      key: "stock",
      label: "Stock",
      render: (row) => {
        const low = row.stock <= row.min;
        return (
          <span className={`font-mono tabular-nums ${low ? "font-semibold text-danger" : "text-text"}`}>
            {row.stock}
            <span className="text-text-subtle"> / {row.min}</span>
          </span>
        );
      },
    },
    {
      key: "unit",
      label: "Unit",
      render: (row) => <span className="text-text-muted">{row.unit}</span>,
    },
    {
      key: "cost",
      label: "Cost",
      render: (row) => (
        <span className="font-mono tabular-nums text-text-muted">$ {row.cost.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Data table</h3>
      <div className="grid gap-4 rounded-panel border border-border bg-surface p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">Transaction history</p>
          <p className="text-xs text-text-muted">Sortable columns with status badges. Click headers to sort.</p>
        </div>
        <DataTable
          columns={transactionCols}
          data={sorted}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          className="px-2 pb-2"
        />
      </div>
      <div className="mt-4 grid gap-4 rounded-panel border border-border bg-surface p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">Inventory levels</p>
          <p className="text-xs text-text-muted">Low stock items highlighted in red.</p>
        </div>
        <DataTable columns={inventoryCols} data={inventoryData} className="px-2 pb-2" />
      </div>
    </div>
  );
}
