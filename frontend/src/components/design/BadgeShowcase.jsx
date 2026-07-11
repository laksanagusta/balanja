import React from "react";
import { Badge, Panel } from "../primitives.jsx";

const tokens = [
  ["Success", "--color-success", "#168a4a"],
  ["Success Soft", "--color-success-soft", "#eaf7ef"],
  ["Warning", "--color-warning", "#ad6a00"],
  ["Warning Soft", "--color-warning-soft", "#fff4da"],
  ["Danger", "--color-danger", "#ef4444"],
  ["Danger Soft", "--color-danger-soft", "#fff1f1"],
  ["Accent Soft", "--color-accent-soft", "#f2f2f3"],
  ["Muted Surface", "--color-surface-muted", "#f6f6f6"],
];

export default function BadgeShowcase() {
  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Badge</h3>
        <p className="mt-1 text-sm text-text-muted">Semantic tones for status labels.</p>
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_240px]">
        <div className="flex flex-wrap items-start gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="accent">Selected</Badge>
          <Badge tone="success">Paid</Badge>
          <Badge tone="warning">Pending</Badge>
          <Badge tone="danger">Void</Badge>
        </div>
        <div className="rounded-card border border-border bg-surface-muted p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Tokens</p>
          <div className="grid gap-2">
            {tokens.map(([label, name, value]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="size-4 shrink-0 rounded border border-border" style={{ background: value }} />
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
