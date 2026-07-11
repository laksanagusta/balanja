import React from "react";
import { Button, Icon, Panel } from "../primitives.jsx";

const tokens = [
  ["Accent", "--color-accent", "#1d1d1f"],
  ["Accent Hover", "--color-accent-hover", "#000000"],
  ["Danger", "--color-danger", "#ef4444"],
  ["Danger Soft", "--color-danger-soft", "#fff1f1"],
  ["Radius", "--radius-control", "10px"],
  ["Shadow Accent", "--shadow-accent", "0 12px 22px rgb(29 29 31 / 0.18)"],
];

export default function ButtonShowcase() {
  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Button</h3>
        <p className="mt-1 text-sm text-text-muted">Primary, secondary, danger, ghost, and disabled states.</p>
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_240px]">
        <div className="flex flex-wrap items-start gap-3">
          <Button variant="primary" onClick={() => alert("Primary action")}>Primary action</Button>
          <Button onClick={() => alert("Secondary action")}>Secondary action</Button>
          <Button variant="ghost" onClick={() => alert("Ghost action")}>Ghost</Button>
          <Button variant="danger" onClick={() => alert("Destructive")}>
            <Icon name="trash" className="size-4" />
            Destructive
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="primary" disabled>Disabled</Button>
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
