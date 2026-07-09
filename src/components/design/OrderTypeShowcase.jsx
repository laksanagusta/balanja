import React from "react";
import { Badge } from "../primitives.jsx";

const types = [
  { id: "dine-in", label: "Dine In", desc: "Serve at table 12" },
  { id: "takeaway", label: "Takeaway", desc: "Pack to go" },
  { id: "delivery", label: "Delivery", desc: "Deliver to address" },
];

const statuses = [
  { label: "Order #1024", type: "Dine In", table: "Table 5", time: "10 min ago", items: 3, total: "$ 24.50", status: "preparing" },
  { label: "Order #1023", type: "Takeaway", table: null, time: "18 min ago", items: 1, total: "$ 8.00", status: "ready" },
  { label: "Order #1022", type: "Delivery", table: null, time: "32 min ago", items: 5, total: "$ 42.30", status: "pending" },
];

export default function OrderTypeShowcase() {
  const [active, setActive] = React.useState("dine-in");

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Order types & status</h3>
      <div className="grid gap-4 rounded-panel border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr]">
        <div>
          <div className="flex gap-2 rounded-control bg-surface-muted p-1">
            {types.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                  active === t.id ? "bg-surface text-text shadow-low" : "text-text-muted hover:text-text"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-card border border-border bg-surface-muted p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-surface text-text-muted">
                {active === "dine-in" && <span className="text-lg">🍽</span>}
                {active === "takeaway" && <span className="text-lg">🥡</span>}
                {active === "delivery" && <span className="text-lg">🚚</span>}
              </span>
              <div>
                <p className="font-semibold text-text">{types.find((t) => t.id === active)?.label}</p>
                <p className="text-xs text-text-muted">{types.find((t) => t.id === active)?.desc}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Live orders</p>
          {statuses.map((o) => (
            <div key={o.label} className="flex items-center gap-3 rounded-md bg-surface-muted p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text">{o.label}</p>
                  <Badge tone={o.status === "ready" ? "success" : o.status === "preparing" ? "accent" : "warning"}>
                    {o.status}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted">
                  {o.type}{o.table ? ` · ${o.table}` : ""} · {o.items} items · {o.time}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums text-text">{o.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
