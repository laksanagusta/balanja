import React from "react";
import { Badge, DataTable } from "../primitives.jsx";
import { transactionData, inventoryData } from "../../data.js";
import { getNextSortState, sortRows } from "../../lib/sorting.js";

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value).replace(/\s+/g, "");
}

export default function DataTableShowcase() {
  const [sortKey, setSortKey] = React.useState("time");
  const [sortDir, setSortDir] = React.useState("desc");
  const [inventorySortKey, setInventorySortKey] = React.useState("stock");
  const [inventorySortDir, setInventorySortDir] = React.useState("asc");

  const handleSort = (key) => {
    const next = getNextSortState(sortKey, sortDir, key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  };

  const handleInventorySort = (key) => {
    const next = getNextSortState(inventorySortKey, inventorySortDir, key);
    setInventorySortKey(next.sortKey);
    setInventorySortDir(next.sortDir);
  };

  const sorted = sortRows(transactionData, sortKey, sortDir, {
    id: { type: "string" },
    time: { type: "string" },
    items: { type: "number" },
    total: { type: "number" },
    payment: { type: "string" },
  });
  const sortedInventory = sortRows(inventoryData, inventorySortKey, inventorySortDir, {
    name: { type: "string" },
    category: { type: "string" },
    stock: { type: "number" },
    cost: { type: "number" },
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
        <span className="font-mono font-semibold tabular-nums">{formatIDR(row.total)}</span>
      ),
    },
    { key: "payment", label: "Payment", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (row) => statusBadge(row.status),
    },
    { key: "cashier", label: "Cashier" },
  ];

  const inventoryCols = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Item", sortable: true },
    { key: "category", label: "Category", sortable: true },
    {
      key: "stock",
      label: "Stock",
      sortable: true,
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
      sortable: true,
      render: (row) => (
        <span className="font-mono tabular-nums text-text-muted">{formatIDR(row.cost)}</span>
      ),
    },
  ];

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Data table</h3>
      <div className="grid rounded-panel border border-border bg-surface p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">Transaction history</p>
          <p className="text-xs text-text-muted">Catalog and history pages share this searchable, sortable table pattern.</p>
        </div>
        <DataTable
          columns={transactionCols}
          data={sorted}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          paginated
          pageSize={6}
          className="px-2 pb-2"
        />
      </div>
      <div className="mt-4 grid rounded-panel border border-border bg-surface p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">Product stock levels</p>
          <p className="text-xs text-text-muted">Low stock items highlighted in red.</p>
        </div>
        <DataTable
          columns={inventoryCols}
          data={sortedInventory}
          sortKey={inventorySortKey}
          sortDir={inventorySortDir}
          onSort={handleInventorySort}
          paginated
          pageSize={6}
          className="px-2 pb-2"
        />
      </div>
    </div>
  );
}
