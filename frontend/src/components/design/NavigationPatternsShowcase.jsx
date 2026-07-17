import React from "react";
import { Icon, Panel } from "../primitives.jsx";

const groups = [
  { label: "Ringkasan", items: [["Dashboard", "grid"]] },
  { label: "Operasional", items: [["Kasir", "receipt"], ["Produk", "package"], ["Stok", "box"]] },
  { label: "Catatan", items: [["Transaksi", "file"]] },
];

export default function NavigationPatternsShowcase() {
  return (
    <Panel className="grid gap-5 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Wayfinding pattern</p>
        <h3 className="mt-2 text-xl font-semibold text-text">Navigation and entry points</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-text-muted">
          Dashboard is home, Kasir is the explicit sales workspace, and each supporting destination is grouped by the work it contains.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="relative flex min-h-[460px] flex-col rounded-card border border-border bg-surface p-3" aria-label="Navigation example">
          <div className="grid content-start gap-4">
            {groups.map((group) => (
              <div key={group.label} className="grid gap-1">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">{group.label}</p>
                {group.items.map(([label, icon]) => (
                  <div
                    key={label}
                    className={`flex h-9 items-center gap-2.5 rounded-control px-3 text-sm font-semibold ${label === "Dashboard" ? "bg-surface-muted text-text" : "text-text-muted"}`}
                  >
                    <Icon name={icon} className="size-4" />
                    {label}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="absolute bottom-[76px] left-3 right-3 rounded-card border border-border bg-surface p-2 shadow-panel">
            <div className="px-3 py-2"><p className="truncate text-sm font-semibold text-text">Dika Laksana</p><p className="truncate text-xs text-text-muted">dika@example.com</p></div>
            <div className="border-t border-border pt-1">
              <div className="flex h-9 items-center gap-2.5 rounded-control px-3 text-sm font-semibold text-text-muted"><Icon name="settings" className="size-4" />Pengaturan</div>
              <div className="mt-1 flex h-9 items-center gap-2.5 border-t border-border px-3 pt-1 text-sm font-semibold text-danger"><Icon name="x" className="size-4" />Keluar</div>
            </div>
          </div>
          <div className="mt-auto pt-3">
            <div className="flex items-center gap-3 rounded-control border border-border bg-surface px-2 py-1.5 shadow-low"><span className="size-9 rounded-full bg-[conic-gradient(#f59e0b,#8b5cf6,#06b6d4,#f59e0b)]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text">Dika Laksana</span><span className="block truncate text-xs text-text-muted">dika@example.com</span></span><Icon name="chevron" className="size-4 text-text-muted" /></div>
          </div>
        </aside>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-surface-muted p-4">
            <p className="text-sm font-semibold text-text">Scanner follows the cart</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">Pindai barcode lives inside Kasir, where every detected product and cart change is immediately visible.</p>
          </div>
          <div className="rounded-card border border-border bg-surface-muted p-4">
            <p className="text-sm font-semibold text-text">Insights lead to action</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">Low-stock warnings expose a nearby Kelola stok handoff instead of leaving users to reconstruct the route.</p>
          </div>
          <div className="rounded-card border border-border bg-surface-muted p-4 sm:col-span-2">
            <p className="text-sm font-semibold text-text">Mobile preserves context</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">The same hierarchy appears in a dismissible overlay sheet with neutral selection, clear semantics, and reduced-motion support.</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
