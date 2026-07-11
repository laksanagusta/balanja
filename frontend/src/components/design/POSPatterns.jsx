import React from "react";
import { Button, Icon, Panel } from "../primitives.jsx";

const methods = [
  { id: "cash", label: "Cash", icon: "cash" },
  { id: "qris", label: "QRIS", icon: "qr" },
];

export default function POSPatterns() {
  const [paymentMethod, setPaymentMethod] = React.useState("cash");

  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">POS composite patterns</h3>
        <p className="mt-1 text-sm text-text-muted">
          Product card, barcode search, category tabs, and payment summary — built from the primitives above. App-shell panels keep a consistent 8px inset on every outer edge.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Search bar</p>
          <div className="flex h-[42px] items-center gap-3 rounded-card border border-border bg-surface px-4 shadow-inner-soft">
            <Icon name="search" className="size-5 text-text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
              placeholder="Search products or barcode..."
            />
            <kbd className="rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-semibold text-text-subtle">
              Cmd K
            </kbd>
          </div>
        </div>
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Category tabs</p>
          <div className="flex gap-2 rounded-control bg-surface-muted p-1">
            {["Semua", "Sembako", "Minuman"].map((cat) => (
              <button
                key={cat}
                className={`h-10 shrink-0 rounded-md px-5 text-sm font-medium transition ${
                  cat === "Sembako"
                    ? "bg-surface text-text shadow-low"
                    : "text-text-muted hover:bg-surface/70 hover:text-text"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Payment summary</p>
          <div className="rounded-card border border-border bg-surface p-4">
            <div className="mb-4 grid grid-cols-2 gap-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`grid place-items-center gap-1 rounded-md border py-2.5 text-xs font-semibold transition ${
                    paymentMethod === m.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-text-muted hover:bg-surface-muted"
                  }`}
                >
                  <Icon name={m.icon} className="size-4" />
                  {m.label}
                </button>
              ))}
            </div>
            <dl className="grid gap-3 text-[15px]">
              {[
                ["Subtotal", "Rp41.000"],
                ["Tax", "Rp4.500"],
                ["Discount", "-Rp0"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-text-muted">
                  <dt>{label}</dt>
                  <dd className="font-semibold font-mono tabular-nums">{value}</dd>
                </div>
              ))}
              <div className="border-t border-dashed border-border pt-3">
                <div className="flex justify-between text-lg font-semibold text-text">
                  <dt>Grand Total</dt>
                  <dd className="font-mono tabular-nums">Rp45.500</dd>
                </div>
              </div>
            </dl>
            <Button variant="primary" className="checkout-3d mt-4 h-12 w-full text-base" onClick={() => alert("Order placed!")}>
              Complete sale
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
