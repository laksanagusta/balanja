import React from "react";
import { TableFilterPopover } from "../TableFilterPopover.jsx";
import { TablePagination } from "../TablePagination.jsx";
import { Badge, Button, DataTable, Input, SelectField } from "../primitives.jsx";
import { transactionData, inventoryData } from "../../data.js";
import { getNextSortState, sortRows } from "../../lib/sorting.js";
import { ProductThumbnail } from "../product/ProductImage.jsx";

const serverRows = Array.from({ length: 48 }, (_, index) => ({
  ...transactionData[index % transactionData.length],
  id: `${transactionData[index % transactionData.length].id}-${index + 1}`,
}));

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
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [updating, setUpdating] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [payment, setPayment] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [inventorySortKey, setInventorySortKey] = React.useState("stock");
  const [inventorySortDir, setInventorySortDir] = React.useState("asc");

  const activeFilterCount = [payment, dateFrom, dateTo].filter(Boolean).length;
  const filtered = payment ? serverRows.filter((row) => row.payment.toLowerCase() === payment) : serverRows;
  const sorted = sortRows(filtered, sortKey, sortDir, {
    id: { type: "string" },
    time: { type: "string" },
    items: { type: "number" },
    total: { type: "number" },
    payment: { type: "string" },
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const rows = sorted.slice(startIndex, startIndex + pageSize);
  const sortedInventory = sortRows(inventoryData, inventorySortKey, inventorySortDir, {
    name: { type: "string" },
    category: { type: "string" },
    stock: { type: "number" },
    cost: { type: "number" },
  });

  React.useEffect(() => setPage(1), [dateFrom, dateTo, pageSize, payment, sortDir, sortKey]);

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

  const transactionCols = [
    { key: "id", label: "ID", sortable: true },
    { key: "time", label: "Time", sortable: true },
    { key: "items", label: "Items" },
    { key: "total", label: "Total", sortable: true, render: (row) => <span className="font-mono font-semibold tabular-nums">{formatIDR(row.total)}</span> },
    { key: "payment", label: "Payment", sortable: true },
    { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "completed" ? "success" : "warning"}>{row.status}</Badge> },
    { key: "cashier", label: "Cashier" },
  ];
  const inventoryCols = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Item", sortable: true, render: (row) => <div className="flex items-center gap-3"><ProductThumbnail product={row} /><span className="font-semibold">{row.name}</span></div> },
    { key: "category", label: "Category", sortable: true },
    {
      key: "stock",
      label: "Stock",
      sortable: true,
      render: (row) => (
        <span className={`font-mono tabular-nums ${row.stock <= row.min ? "font-semibold text-danger" : "text-text"}`}>
          {row.stock}<span className="text-text-subtle"> / {row.min}</span>
        </span>
      ),
    },
    { key: "unit", label: "Unit", render: (row) => <span className="text-text-muted">{row.unit}</span> },
    { key: "cost", label: "Cost", sortable: true, render: (row) => <span className="font-mono tabular-nums text-text-muted">{formatIDR(row.cost)}</span> },
  ];

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Data table</h3>
      <div className="grid rounded-panel border border-border bg-surface p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text">Transaction history</p>
            <p className="text-xs text-text-muted">Controlled rows, filters, sorting, and sequential navigation.</p>
          </div>
          <div className="flex items-center gap-2">
            {updating && (
              <span className="inline-flex h-7 items-center gap-2 rounded-control border border-border bg-surface-muted px-2.5 text-xs font-semibold text-text-muted">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />Updating
              </span>
            )}
            <Button size="sm" variant="ghost" onClick={() => setUpdating((value) => !value)}>
              {updating ? "Settle" : "Update"}
            </Button>
            <TableFilterPopover open={filtersOpen} onOpenChange={setFiltersOpen} activeCount={activeFilterCount}>
              <SelectField
                label="Payment method"
                value={payment}
                options={[{ value: "", label: "All methods" }, { value: "cash", label: "Cash" }, { value: "qris", label: "QRIS" }]}
                onChange={setPayment}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Date from" inputProps={{ type: "date", value: dateFrom, onChange: (event) => setDateFrom(event.target.value) }} />
                <Input label="Date to" inputProps={{ type: "date", value: dateTo, onChange: (event) => setDateTo(event.target.value) }} />
              </div>
              <Button size="sm" variant="ghost" disabled={!activeFilterCount} onClick={() => { setPayment(""); setDateFrom(""); setDateTo(""); }}>
                Clear filters
              </Button>
            </TableFilterPopover>
          </div>
        </div>
        <DataTable
          columns={transactionCols}
          data={rows}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          className={updating ? "px-2 opacity-60 transition-opacity duration-base ease-standard" : "px-2 transition-opacity duration-base ease-standard"}
        />
        <TablePagination
          start={rows.length ? startIndex + 1 : 0}
          end={startIndex + rows.length}
          page={safePage}
          pageSize={pageSize}
          canPrevious={safePage > 1}
          canNext={safePage < totalPages}
          onPrevious={() => setPage((value) => Math.max(1, value - 1))}
          onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
          onPageSizeChange={setPageSize}
          loading={updating}
        />
      </div>
      <div className="mt-4 grid rounded-panel border border-border bg-surface p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">Product stock levels</p>
          <p className="text-xs text-text-muted">Presentational table rows with workflow-specific sorting.</p>
        </div>
        <DataTable
          columns={inventoryCols}
          data={sortedInventory}
          sortKey={inventorySortKey}
          sortDir={inventorySortDir}
          onSort={handleInventorySort}
          className="px-2 pb-2"
        />
      </div>
    </div>
  );
}
