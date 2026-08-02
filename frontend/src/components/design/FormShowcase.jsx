import React from "react";
import { Icon, Input, Panel, SelectField, Switch } from "../primitives.jsx";

const tokens = [
  ["Border", "--color-border", "#ececec"],
  ["Strong Border", "--color-border-strong", "#d9d9d9"],
  ["Focus", "--color-focus", "#4a4a4d"],
  ["Success Control", "--color-success-control", "#34c759"],
  ["Radius", "--radius-card", "16px"],
  ["Mobile field hit", "--control-height-mobile-field-hit", "36px"],
  ["Mobile input", "--control-height-mobile-input", "36px"],
  ["Mobile input large", "--control-height-mobile-input-large", "56px"],
  ["Mobile search", "--control-height-mobile-search", "44px"],
  ["Inner Soft", "--shadow-inner-soft", "inset 0 0 0 1px rgb(0 0 0 / 0.01)"],
];

export default function FormShowcase() {
  const [category, setCategory] = React.useState("Sembako");

  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Form fields</h3>
        <p className="mt-1 text-sm text-text-muted">Standard input and select surfaces and hit areas use 36px (`h-9`) on mobile; operational search fields remain 44px and large inputs remain 56px. Desktop keeps the same compact operational scale. Editable text stays at least 16px on touch devices so focusing a field never triggers browser auto-zoom. Human-facing labels remain Manrope; machine data such as barcode, price, and stock values may use JetBrains Mono with tabular figures.</p>
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_240px]">
        <div className="grid max-w-md gap-2">
          <Input label="Input field" placeholder="Placeholder text" error="This field needs attention" rightSlot={<Icon name="search" className="size-4" />} />
          <div className="grid gap-2">
            <span className="text-sm font-semibold text-text">Barcode with scan action</span>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  placeholder="8997001230011"
                  inputClassName="font-mono tabular-nums tracking-[0.01em]"
                />
              </div>
              <button type="button" aria-label="Scan barcode" className="grid size-9 shrink-0 place-items-center rounded-control text-text-muted hover:bg-surface-muted hover:text-text">
                <Icon name="scan" className="size-5" />
              </button>
            </div>
          </div>
          <Input size="large" label="Large input field" placeholder="Large mobile input" />
          <SelectField label="Popover select" value={category} options={["Sembako", "Minuman", "Snack"]} onChange={setCategory} />
          <div className="flex items-center justify-between rounded-card border border-border p-4">
            <span className="text-sm font-semibold text-text">Enabled switch</span>
            <Switch checked />
          </div>
          <div className="flex items-center justify-between rounded-card border border-border p-4">
            <span className="text-sm font-semibold text-text">Active product switch</span>
            <Switch checked tone="success" />
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
