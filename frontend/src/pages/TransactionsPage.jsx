import React from "react";
import { Badge, Button, DataTable, Dialog, Icon } from "../components/primitives.jsx";
import { EmptyState } from "../components/design/EmptyStateShowcase.jsx";
import { TransactionsPageSkeleton } from "../components/page-loading.jsx";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { getNextSortState, sortRows } from "../lib/sorting.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const transactionSortConfig = {
  number: { type: "string" },
  createdAt: { type: "date" },
  paymentMethod: { type: "string" },
  total: { type: "number" },
};

export default function TransactionsPage() {
  const store = usePOSStore();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [sortKey, setSortKey] = React.useState("createdAt");
  const [sortDir, setSortDir] = React.useState("desc");
  const [isPageLoading, setIsPageLoading] = React.useState(() => !store.loaded.transactions);
  const debouncedQuery = useDebouncedValue(query, 220);
  const isInitialLoad = isPageLoading;

  React.useEffect(() => {
    const controller = new AbortController();
    if (!store.loaded.transactions) setIsPageLoading(true);
    store.loadTransactions({ force: true, signal: controller.signal }).finally(() => {
      if (!controller.signal.aborted) setIsPageLoading(false);
    });
    return () => controller.abort();
  }, [store.loadTransactions]);

  if (isInitialLoad) {
    return <TransactionsPageSkeleton />;
  }

  const handleSort = (key) => {
    const next = getNextSortState(sortKey, sortDir, key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  };

  const isUpdatingTransactions = store.loading.transactions && store.loaded.transactions;
  const filteredTransactions = store.transactions.filter((transaction) =>
    `${transaction.number} ${transaction.cashierName} ${transaction.paymentMethod}`
      .toLowerCase()
      .includes(debouncedQuery.toLowerCase()),
  );
  const transactions = sortRows(filteredTransactions, sortKey, sortDir, transactionSortConfig);

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
      <header className="grid gap-3 border-b border-border px-6 py-3 lg:grid-cols-[auto_1fr] lg:items-center">
        <h1 className="text-base font-semibold text-text">Transactions</h1>
        <div className="flex w-full min-w-0 lg:ml-auto lg:w-[420px]">
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
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid gap-4 rounded-panel border border-border bg-surface p-0">
          <div className="border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">Transaction history</p>
                <p className="text-xs text-text-muted">Sortable rows with payment method, cashier, and sale total.</p>
              </div>
              {isUpdatingTransactions && <UpdatingBadge />}
            </div>
          </div>
          {transactions.length ? (
            <DataTable
              columns={columns}
              data={transactions}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              paginated
              pageSize={8}
              className={`px-2 pb-2 ${isUpdatingTransactions ? "opacity-60 transition-opacity duration-base ease-standard" : "transition-opacity duration-base ease-standard"}`}
            />
          ) : (
            <EmptyState
              icon={query ? "search" : "receipt"}
              title={query ? "No transactions found" : "No transactions yet"}
              description={query ? "Try a different transaction, cashier, or payment method." : "Completed sales will appear here."}
              className="m-4 min-h-[240px]"
            />
          )}
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
