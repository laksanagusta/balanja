import React from "react";
import { Icon, Input, Panel, SelectField, Switch } from "../primitives.jsx";

const tokens = [
  ["Border", "--color-border", "#ececec"],
  ["Strong Border", "--color-border-strong", "#d9d9d9"],
  ["Focus", "--color-focus", "#4a4a4d"],
  ["Radius", "--radius-control", "10px"],
  ["Inner Soft", "--shadow-inner-soft", "inset 0 0 0 1px rgb(0 0 0 / 0.01)"],
];

export default function FormShowcase() {
  const [category, setCategory] = React.useState("Sembako");

  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Form fields</h3>
        <p className="mt-1 text-sm text-text-muted">Input, select, and toggle components.</p>
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_240px]">
        <div className="grid max-w-md gap-4">
          <Input label="Input field" placeholder="Placeholder text" error="This field needs attention" rightSlot={<Icon name="search" className="size-4" />} />
          <SelectField label="Popover select" value={category} options={["Sembako", "Minuman", "Snack"]} onChange={setCategory} />
          <div className="flex items-center justify-between rounded-card border border-border p-4">
            <span className="text-sm font-semibold text-text">Enabled switch</span>
            <Switch checked />
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
