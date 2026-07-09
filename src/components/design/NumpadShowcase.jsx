import React from "react";
import { Icon } from "../primitives.jsx";

const keys = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["00", "0", "."],
];

export default function NumpadShowcase() {
  const [value, setValue] = React.useState("0");
  const [qty, setQty] = React.useState(1);

  const handleKey = (k) => {
    setValue((v) => {
      if (k === "." && v.includes(".")) return v;
      if (v === "0" && k !== ".") return k;
      return v + k;
    });
  };

  const handleBackspace = () => {
    setValue((v) => (v.length > 1 ? v.slice(0, -1) : "0"));
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Numeric keypad</h3>
      <div className="grid gap-4 rounded-panel border border-border bg-surface p-4 sm:grid-cols-2">
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Price input</p>
          <div className="rounded-control border border-border bg-surface-muted px-4 py-3 text-right font-mono text-2xl font-bold tabular-nums text-text shadow-inner-soft">
            $ {value}
          </div>
          <div className="grid gap-2">
            {keys.map((row) => (
              <div key={row.join("")} className="flex gap-2">
                {row.map((k) => (
                  <button
                    key={k}
                    onClick={() => handleKey(k)}
                    className="flex h-12 flex-1 items-center justify-center rounded-md border border-border bg-surface text-base font-semibold text-text transition hover:bg-surface-muted active:scale-95"
                  >
                    {k}
                  </button>
                ))}
              </div>
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleBackspace}
                className="flex h-12 flex-1 items-center justify-center gap-1 rounded-md border border-border bg-surface text-sm font-semibold text-text-muted transition hover:bg-surface-muted active:scale-95"
              >
                <Icon name="x" className="size-4" />
                Clear
              </button>
              <button className="flex h-12 flex-[2] items-center justify-center rounded-md bg-accent text-base font-semibold text-white shadow-accent transition hover:bg-accent-hover active:scale-95">
                Enter
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Quantity stepper</p>
          <div className="flex items-center justify-center gap-4 rounded-card border border-border bg-surface-muted p-6">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex size-12 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition hover:bg-surface-muted active:scale-90"
            >
              <Icon name="minus" className="size-5" />
            </button>
            <span className="min-w-[3ch] text-center font-mono text-3xl font-bold tabular-nums text-text">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex size-12 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition hover:bg-surface-muted active:scale-90"
            >
              <Icon name="plus" className="size-5" />
            </button>
          </div>
          <div className="mt-4 rounded-card border border-border bg-surface-muted p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Quick amounts</p>
            <div className="grid grid-cols-3 gap-2">
              {["$ 1.00", "$ 5.00", "$ 10.00", "$ 20.00", "$ 50.00", "$ 100.00"].map((amt) => (
                <button
                  key={amt}
                  className="h-10 rounded-md border border-border bg-surface text-sm font-semibold text-text transition hover:bg-surface-muted active:scale-95"
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
