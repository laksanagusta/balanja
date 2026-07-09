import React from "react";
import { Badge, Button, DataTable, Dialog } from "../components/primitives.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";

export default function TransactionsPage() {
  const { transactions } = usePOSStore();
  const [selected, setSelected] = React.useState(null);
  const [sortKey, setSortKey] = React.useState("createdAt");
  const [sortDir, setSortDir] = React.useState("desc");

  const sortedTransactions = [...transactions].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (a[sortKey] < b[sortKey]) return -1 * dir;
    if (a[sortKey] > b[sortKey]) return 1 * dir;
    return 0;
  });

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const columns = [
    {
      key: "number",
      label: "Number",
      sortable: true,
      render: (transaction) => <span className="font-mono font-semibold">{transaction.number}</span>,
    },
    {
      key: "createdAt",
      label: "Time",
      sortable: true,
      render: (transaction) => new Date(transaction.createdAt).toLocaleString("id-ID"),
    },
    {
      key: "items",
      label: "Items",
      render: (transaction) => transaction.items.reduce((sum, item) => sum + item.qty, 0),
    },
    {
      key: "paymentMethod",
      label: "Payment",
      sortable: true,
      render: (transaction) => <span className="uppercase">{transaction.paymentMethod}</span>,
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      render: (transaction) => (
        <span className="font-mono font-semibold tabular-nums">{formatPrice(transaction.total)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (transaction) => <Badge tone="success">{transaction.status}</Badge>,
    },
    {
      key: "actions",
      label: "Action",
      render: (transaction) => (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => setSelected(transaction)}>
            Details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-app-bg">
      <header className="border-b border-border bg-surface p-4">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <p className="text-sm text-text-muted">{transactions.length} completed sales</p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid gap-4 rounded-panel border border-border bg-surface p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text">Transaction history</p>
            <p className="text-xs text-text-muted">Sortable completed sales with payment status.</p>
          </div>
          <DataTable
            columns={columns}
            data={sortedTransactions}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            className="px-2 pb-2"
          />
        </div>
        {transactions.length === 0 && (
          <p className="py-12 text-center text-sm font-medium text-text-muted">No transactions yet</p>
        )}
      </div>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.number}
        size="lg"
        footer={<Button onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && (
          <div className="mt-4 grid gap-4 text-text">
            <div className="grid gap-2">
              {selected.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex justify-between gap-3 rounded-control bg-surface-muted px-3 py-2 text-sm"
                >
                  <span>
                    {item.name} x{item.qty}
                  </span>
                  <span className="font-mono">{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatPrice(selected.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(selected.total)}</span>
              </div>
              {selected.paymentMethod === "cash" && (
                <div className="flex justify-between">
                  <span>Change</span>
                  <span>{formatPrice(selected.changeDue)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
