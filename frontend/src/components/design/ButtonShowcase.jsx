import React from "react";
import { Button, Icon, Panel } from "../primitives.jsx";

const tokens = [
  ["Accent", "--color-accent", "#1d1d1f"],
  ["Accent Hover", "--color-accent-hover", "#151517"],
  ["Danger", "--color-danger", "#ef4444"],
  ["Danger Soft", "--color-danger-soft", "#fff1f1"],
  ["Standard radius", "--radius-control", "10px"],
  ["Utility radius", "--radius-button", "8px"],
  ["Touch target", "--control-height-mobile-button-hit", "44px"],
  ["Standard", "--control-height-mobile-button", "44px"],
  ["Primary large", "--control-height-mobile-button-large", "48px"],
  ["Mobile compact visual", "--control-height-mobile-compact", "36px"],
  ["Focus", "--color-focus", "#4a4a4d"],
  ["Fast duration", "--duration-fast", "120ms"],
];

export default function ButtonShowcase() {
  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Button</h3>
        <p className="mt-1 text-sm text-text-muted">Buttons use one flat system without gradients, bevels, or elevation shadows. Standard actions use a 44px visual height, prominent primary actions use 48px, and compact actions keep a 36px visual surface inside a 44px interaction target. Every variant keeps the same focus outline, disabled opacity, and immediate pointer-down press scale.</p>
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_240px]">
        <div className="grid gap-5">
          <div className="flex flex-wrap items-start gap-3">
            <Button variant="primary" onClick={() => alert("Tambah produk")}>
              <Icon name="plus" className="size-4" />
              Tambah produk
            </Button>
            <Button onClick={() => alert("Secondary action")}>Secondary action</Button>
            <Button variant="ghost" onClick={() => alert("Ghost action")}>Ghost</Button>
            <Button variant="danger" onClick={() => alert("Destructive")}>
              <Icon name="trash" className="size-4" />
              Destructive
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Mobile sizing contract</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Standard · 44</Button>
              <Button variant="primary" mobileSize="large">Primary besar · 48</Button>
              <Button size="sm" compactVisual>Compact · 36/44</Button>
            </div>
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
