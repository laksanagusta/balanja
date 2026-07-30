import React from "react";
import { Icon, Panel } from "../primitives.jsx";

const mobileItems = [
  ["Beranda", "home"],
  ["Kasir", "receipt"],
  ["Produk", "box"],
  ["Stok", "package"],
  ["Lainnya", "more"],
];

export default function NavigationPatternsShowcase() {
  return (
    <Panel className="grid gap-5 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Wayfinding pattern</p>
        <h3 className="mt-2 text-xl font-semibold text-text">Navigation and entry points</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-text-muted">
          Dashboard is home, Kasir is the explicit sales workspace, and the same smartphone information architecture remains visible at every viewport width.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
          The authenticated shell uses a quiet white top bar with brand and account access, plus four primary workspaces and Lainnya in a persistent five-item bottom navigation. A thin top border and restrained upward shadow separate the navigation from scrolling content. The account avatar sits directly in a transparent 44px target without a visible wrapper surface. Transaksi and Laporan Penjualan remain available from the compact Lainnya sheet. The app canvas is centered and capped at 1200px on larger screens.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
          Public and authenticated headers render the same shared Logo component, preserving identical Manrope type,
          800 weight, capitalization, size, and tracking across landing, authenticated top bar, and overlay navigation.
        </p>
      </div>

      <div className="grid content-start gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-surface-muted p-4">
            <p className="text-sm font-semibold text-text">Scanner follows the cart</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">Pindai barcode lives inside Kasir, where every detected product and cart change is immediately visible. Saat barcode diproses, workspace menampilkan spinner cepat, mengunci pembacaan ganda, dan tetap menyediakan aksi tutup.</p>
          </div>
          <div className="rounded-card border border-border bg-surface-muted p-4">
            <p className="text-sm font-semibold text-text">Insights lead to action</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">Low-stock warnings expose a nearby Kelola stok handoff instead of leaving users to reconstruct the route.</p>
          </div>
          <div className="rounded-card border border-border bg-surface-muted p-4 sm:col-span-2">
            <p className="text-sm font-semibold text-text">One mobile-first app composition</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">The top bar names the active module and uses Balanja only on Beranda. Its 16px edges align with page content; all five destinations retain at least a 44px hit target.</p>
            <div className="mt-4 max-w-sm overflow-hidden rounded-panel border border-border bg-app-bg shadow-low">
              <div className="flex min-h-16 items-center justify-between bg-surface px-4 py-2">
                <span className="text-lg font-extrabold tracking-normal text-text">Produk</span>
                <span className="account-avatar size-9 rounded-full" />
              </div>
              <div className="grid min-h-36 content-start gap-3 p-4">
                <span className="h-5 w-28 rounded-md bg-border" />
                <span className="h-14 rounded-card bg-surface" />
                <span className="h-14 rounded-card bg-surface" />
              </div>
              <div className="mobile-bottom-navigation grid grid-cols-5 bg-surface px-1 pt-1">
                {mobileItems.map(([label, icon], index) => (
                  <div key={label} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${index === 2 ? "text-accent" : "text-text-muted"}`}>
                    <span className={`grid size-8 place-items-center rounded-full ${index === 2 ? "bg-accent-soft" : ""}`}>
                      <Icon name={icon} className="size-5" />
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-card border border-border bg-surface-muted p-4 sm:col-span-2">
            <p className="text-sm font-semibold text-text">The shell owns the viewport</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">While AppShell is mounted, document scrolling is locked and each workspace uses its bounded internal scroller. The shell stays full-bleed until it reaches its centered 1200px maximum width; no desktop sidebar or shell inset is introduced.</p>
          </div>
      </div>
    </Panel>
  );
}
