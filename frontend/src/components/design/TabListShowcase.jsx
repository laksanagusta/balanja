import React from "react";
import { Badge, Panel } from "../primitives.jsx";
import { orderItems } from "../../data.js";

const tokens = [
  ["Card Radius", "--radius-card", "12px"],
  ["Low Shadow", "--shadow-low", "0 1px 2px rgb(0 0 0 / 0.05)"],
  ["Muted Surface", "--color-surface-muted", "#f6f6f6"],
  ["Text Subtle", "--color-text-subtle", "#a1a1a1"],
];

export default function TabListShowcase() {
  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Tabs & list rows</h3>
        <p className="mt-1 text-sm text-text-muted">Segmented controls and compact item rows.</p>
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_240px]">
        <div className="grid gap-6">
          <div className="flex rounded-control bg-surface-muted p-1">
            {["Overview", "Orders", "Kitchen"].map((tab, index) => (
              <button
                key={tab}
                className={`h-10 flex-1 rounded-md text-sm font-semibold ${
                  index === 0 ? "bg-surface text-text shadow-low" : "text-text-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            {orderItems.map((item) => (
              <div key={item.name} className="flex items-center gap-3 rounded-md bg-surface-muted p-3">
                <img src={item.image} alt="" className="size-12 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">{item.name}</p>
                  <p className="text-xs text-text-muted">{item.quantity} items in cart</p>
                </div>
                <Badge tone="accent"><span className="font-mono tabular-nums">{item.subtotal}</span></Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface-muted p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Tokens</p>
          <div className="grid gap-2">
            {tokens.map(([label, name, value]) => (
              <div key={name} className="flex items-center gap-2">
                {value.startsWith("#") && (
                  <span className="size-4 shrink-0 rounded border border-border" style={{ background: value }} />
                )}
                <span className="truncate font-mono text-[11px] text-text-muted">{name}</span>
                <span className="ml-auto shrink-0 text-[11px] text-text-subtle">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
