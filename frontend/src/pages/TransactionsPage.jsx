import React from "react";
import { createPortal } from "react-dom";
import { Button, Dialog, Icon } from "../components/primitives.jsx";
import { EmptyState } from "../components/feedback/EmptyState.jsx";
import BackgroundUpdateStatus from "../components/feedback/BackgroundUpdateStatus.jsx";
import { TransactionsPageSkeleton } from "../components/page-loading.jsx";
import { TransactionCardList } from "../components/transactions/TransactionCardList.jsx";
import { TransactionFilterDrawer } from "../components/transactions/TransactionFilterDrawer.jsx";
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
  const [topBarActionsTarget, setTopBarActionsTarget] = React.useState(null);
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
    initialPageSize: 6,
  });
  const activeFilterCount = [paymentMethod, dateFrom, dateTo].filter(Boolean).length;

  React.useEffect(() => {
    setTopBarActionsTarget(document.getElementById("app-top-bar-actions"));
  }, []);

  if (table.isInitialLoading) {
    return <TransactionsPageSkeleton />;
  }

  const topBarActions = topBarActionsTarget
    ? createPortal(
      <>
        <BackgroundUpdateStatus active={table.isUpdating} label="Memperbarui daftar transaksi" />
        <TransactionFilterDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          sort={`${table.sortKey}:${table.sortDir}`}
          onSortChange={(nextSort) => {
            const [sortKey, sortDir] = nextSort.split(":");
            table.setSort(sortKey, sortDir);
          }}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
        />
      </>,
      topBarActionsTarget,
    )
    : null;

  return (
    <>
      {topBarActions}
      <div className="flex h-full min-h-0 flex-col bg-surface">
        <header className="px-4 py-3">
          <div className="flex w-full min-w-0">
            <div className="mobile-search-control flex h-11 min-w-0 flex-1 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus/30">
              <Icon name="search" className="size-4 text-text-muted" />
              <input
                aria-label="Cari transaksi"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
                placeholder="Transaksi, kasir, pembayaran"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
          {table.rows.length ? (
            <TransactionCardList transactions={table.rows} formatDate={formatDate} onSelect={setSelected} />
          ) : (
            <EmptyState
              icon={query || activeFilterCount ? "search" : "receipt"}
              title={table.error ? "Transaksi gagal dimuat" : query || activeFilterCount ? "Transaksi tidak ditemukan" : "Belum ada transaksi"}
              description={table.error ? table.error.message : query || activeFilterCount ? "Coba kata kunci atau filter lain." : "Transaksi yang selesai akan muncul di sini."}
              action={table.error ? <Button size="sm" variant="secondary" onClick={table.retry}>Coba lagi</Button> : undefined}
              className="m-4 min-h-[240px]"
            />
          )}
          {(table.hasMore || (table.error && table.rows.length > 0)) && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                className="min-w-36"
                disabled={table.loading}
                onClick={() => table.loadMore()}
              >
                {table.loading ? "Memuat..." : table.error ? "Coba lagi" : "Muat lebih banyak"}
              </Button>
            </div>
          )}
        </div>

        <Dialog
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={selected?.number || "Detail transaksi"}
          size="lg"
          footer={<Button onClick={() => setSelected(null)}>Tutup</Button>}
        >
          {selected && (
            <div className="mt-4 grid gap-4">
            <div className="grid gap-2 rounded-card border border-border bg-surface-muted p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Kasir</span>
                <span className="font-semibold text-text">{selected.cashierName || "Tidak diketahui"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Pembayaran</span>
                <span className="font-semibold text-text">{selected.paymentMethod === "cash" ? "Tunai" : selected.paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Waktu</span>
                <span className="font-semibold text-text">{formatDate(selected.createdAt)}</span>
              </div>
            </div>

            <div className="rounded-card border border-border">
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
                <dt>Pajak</dt>
                <dd className="font-mono font-semibold">{formatPrice(selected.tax)}</dd>
              </div>
              <div className="flex justify-between pt-3 text-lg font-semibold text-text">
                <dt>Total</dt>
                <dd className="font-mono">{formatPrice(selected.total)}</dd>
              </div>
            </dl>
            </div>
          )}
        </Dialog>
      </div>
    </>
  );
}
