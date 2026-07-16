import React from "react";
import { Button, Icon } from "../primitives.jsx";

const methods = [
  { name: "Cash", icon: "cash" },
  { name: "QRIS", icon: "qr" },
];

export default function PaymentShowcase() {
  const [selected, setSelected] = React.useState("Cash");

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Payment methods</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Select payment method and enter the received amount.</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => (
              <button
                key={m.name}
                onClick={() => setSelected(m.name)}
                className={`grid place-items-center gap-1.5 rounded-card border p-4 text-sm font-semibold transition ${
                  selected === m.name
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-surface text-text-muted hover:bg-surface-muted"
                }`}
              >
                <Icon name={m.icon} className="size-6" />
                {m.name}
              </button>
            ))}
          </div>
          <div className="grid content-start gap-3 rounded-card border border-border bg-surface-muted p-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Total due</span>
              <span className="font-mono font-semibold tabular-nums text-text">Rp45.500</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Amount paid</span>
              <span className="font-mono font-semibold tabular-nums text-text">Rp50.000</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-success">
              <span>Change</span>
              <span className="font-mono tabular-nums">Rp4.500</span>
            </div>
            <Button variant="primary" className="mt-2 h-12 w-full text-base">
              <Icon name="check" className="size-5" />
              Confirm payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
