import React from "react";
import { TableFilterPopover } from "../components/TableFilterPopover.jsx";
import { TablePagination } from "../components/TablePagination.jsx";
import { Badge, Button, DataTable, Dialog, Icon, Input, SelectField } from "../components/primitives.jsx";
import { EmptyState } from "../components/feedback/EmptyState.jsx";
import { TransactionsPageSkeleton } from "../components/page-loading.jsx";
import { useCursorTable } from "../hooks/useCursorTable.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { usePOSStore } from "../pos/store.jsx";
import { loadTransactionPage } from "../pos/store-data.js";
import { formatPrice } from "../shared.jsx";
import { dateBoundaryWIB, readTransactionFilters } from "../transactions/transaction-filters.js";

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TransactionsPage() {
  const store = usePOSStore();
  const initialFilters = React.useRef(readTransactionFilters(window.location.search)).current;
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState(initialFilters.paymentMethod);
  const [dateFrom, setDateFrom] = React.useState(initialFilters.dateFrom);
  const [dateTo, setDateTo] = React.useState(initialFilters.dateTo);
  const debouncedQuery = useDebouncedValue(query, 220);
  const transactionFilters = React.useMemo(() => ({
    q: debouncedQuery.trim(),
    paymentMethod,
    dateFrom: dateBoundaryWIB(dateFrom),
    dateTo: dateBoundaryWIB(dateTo, true),
  }), [dateFrom, dateTo, debouncedQuery, paymentMethod]);
  const fetchTransactionPage = React.useCallback(
    (request) => loadTransactionPage(store.api, request),
    [store.api],
  );
  const table = useCursorTable({
    fetchPage: fetchTransactionPage,
    filters: transactionFilters,
    initialSortKey: "createdAt",
    initialSortDir: "desc",
  });
  const activeFilterCount = [paymentMethod, dateFrom, dateTo].filter(Boolean).length;

  if (table.isInitialLoading) {
    return <TransactionsPageSkeleton />;
  }

  const columns = [
    { key: "number", label: "Transaction", sortable: true, render: (row) => <span className="font-semibold">{row.number}</span> },
    { key: "createdAt", label: "Time", sortable: true, render: (row) => <span className="text-text-muted">{formatDate(row.createdAt)}</span> },
    { key: "items", label: "Items", render: (row) => row.items.reduce((sum, item) => sum + item.qty, 0) },
    { key: "paymentMethod", label: "Payment", sortable: true, render: (row) => row.paymentMethod.toUpperCase() },
    { key: "total", label: "Total", sortable: true, render: (row) => <span className="font-mono font-semibold tabular-nums">{formatPrice(row.total)}</span> },
    { key: "status", label: "Status", render: (row) => <Badge tone="success">{row.status}</Badge> },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={() => setSelected(row)}>
          <Icon name="eye" className="size-4" />
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
        <h1 className="text-base font-semibold text-text">Transactions</h1>
        <div className="flex min-w-[220px] flex-1 lg:ml-auto lg:max-w-[420px]">
          <div className="flex h-9 min-w-0 flex-1 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft">
            <Icon name="search" className="size-4 text-text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
              placeholder="Transaction, cashier, payment"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <TableFilterPopover
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          activeCount={activeFilterCount}
        >
          <SelectField
            label="Payment method"
            value={paymentMethod}
            options={[
              { value: "", label: "All methods" },
              { value: "cash", label: "Cash" },
              { value: "qris", label: "QRIS" },
            ]}
            onChange={setPaymentMethod}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date from"
              inputProps={{
                type: "date",
                value: dateFrom,
                max: dateTo || undefined,
                onChange: (event) => setDateFrom(event.target.value),
              }}
            />
            <Input
              label="Date to"
              inputProps={{
                type: "date",
                value: dateTo,
                min: dateFrom || undefined,
                onChange: (event) => setDateTo(event.target.value),
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={activeFilterCount === 0}
            onClick={() => { setPaymentMethod(""); setDateFrom(""); setDateTo(""); }}
          >
            Clear filters
          </Button>
        </TableFilterPopover>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid rounded-panel border border-border bg-surface p-0">
          <div className="border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">Transaction history</p>
                <p className="text-xs text-text-muted">Sortable rows with payment method, cashier, and sale total.</p>
              </div>
              {table.isUpdating && <UpdatingBadge />}
            </div>
          </div>
          {table.rows.length ? (
            <DataTable
              columns={columns}
              data={table.rows}
              sortKey={table.sortKey}
              sortDir={table.sortDir}
              onSort={table.sortBy}
              className={`px-2 ${table.isUpdating ? "opacity-60 transition-opacity duration-base ease-standard" : "transition-opacity duration-base ease-standard"}`}
            />
          ) : (
            <EmptyState
              icon={query || activeFilterCount ? "search" : "receipt"}
              title={table.error ? "Transactions could not be loaded" : query || activeFilterCount ? "No transactions found" : "No transactions yet"}
              description={table.error ? table.error.message : query || activeFilterCount ? "Try a different search or filter set." : "Completed sales will appear here."}
              action={table.error ? <Button size="sm" variant="secondary" onClick={table.retry}>Retry</Button> : undefined}
              className="m-4 min-h-[240px]"
            />
          )}
          <TablePagination
            {...table.range}
            pageSize={table.pageSize}
            canPrevious={table.canPrevious}
            canNext={table.canNext}
            onPrevious={table.previous}
            onNext={table.next}
            onPageSizeChange={table.setPageSize}
            loading={table.loading}
          />
        </div>
      </div>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.number || "Transaction detail"}
        size="lg"
        footer={<Button onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2 rounded-card border border-border bg-surface-muted p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Cashier</span>
                <span className="font-semibold text-text">{selected.cashierName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Payment</span>
                <span className="font-semibold text-text">{selected.paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Time</span>
                <span className="font-semibold text-text">{formatDate(selected.createdAt)}</span>
              </div>
            </div>

            <div className="divide-y divide-border rounded-card border border-border">
              {selected.items.map((item) => (
                <div key={item.productId} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{item.name}</p>
                    <p className="truncate font-mono text-[11px] text-text-subtle">{item.barcode}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-text">x{item.qty}</p>
                    <p className="font-mono text-sm text-text-muted">{formatPrice(item.qty * item.price)}</p>
                  </div>
                </div>
              ))}
            </div>

            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between text-text-muted">
                <dt>Subtotal</dt>
                <dd className="font-mono font-semibold">{formatPrice(selected.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-text-muted">
                <dt>Tax</dt>
                <dd className="font-mono font-semibold">{formatPrice(selected.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-dashed border-border pt-3 text-lg font-semibold text-text">
                <dt>Total</dt>
                <dd className="font-mono">{formatPrice(selected.total)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function UpdatingBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-control border border-border bg-surface-muted px-2.5 text-xs font-semibold text-text-muted">
      <span className="size-1.5 animate-pulse rounded-full bg-accent" />
      Updating
    </span>
  );
}
