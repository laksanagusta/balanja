import React from "react";
import { PosProductCard } from "../pos/ProductCard.jsx";
import { Button, Icon, Panel } from "../primitives.jsx";

const methods = [
  { id: "cash", label: "Tunai", icon: "cash" },
  { id: "qris", label: "QRIS", icon: "qr" },
];

const sampleProduct = {
  id: "design-pos-product",
  name: "Beras Premium 5 kg",
  category: "Sembako",
  price: "Rp72.000",
  stock: 18,
  unit: "pack",
};

export default function POSPatterns() {
  const [paymentMethod, setPaymentMethod] = React.useState("cash");

  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Pola komposit kasir</h3>
        <p className="mt-1 text-sm text-text-muted">
          Kartu produk, pencarian barcode, tab kategori, dan ringkasan pembayaran dibangun dari primitive di atas. Panel app shell menjaga inset 8px yang konsisten dan memakai border tanpa bayangan wrapper di sela panel.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Kartu produk</p>
          <PosProductCard product={sampleProduct} onAdd={() => ({ ok: true })} />
        </div>
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Kolom pencarian</p>
          <div className="flex h-[42px] items-center gap-3 rounded-card border border-border bg-surface px-4 shadow-inner-soft">
            <Icon name="search" className="size-5 text-text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
              name="designProductSearch"
              autoComplete="off"
              aria-label="Cari produk atau barcode"
              aria-keyshortcuts="Meta+K Control+K"
              placeholder="Cari produk atau barcode…"
            />
            <kbd className="rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-semibold text-text-subtle">
              ⌘ K / Ctrl K
            </kbd>
          </div>
        </div>
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Tab kategori</p>
          <div className="flex gap-2 rounded-control bg-surface-muted p-1">
            {["Semua", "Sembako", "Minuman"].map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={cat === "Sembako"}
                className={`h-10 shrink-0 rounded-md px-5 text-sm font-medium transition ${
                  cat === "Sembako"
                    ? "bg-surface text-text shadow-low"
                    : "text-text-muted hover:bg-surface/70 hover:text-text"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Ringkasan pembayaran</p>
          <div className="rounded-card border border-border bg-surface p-4">
            <div className="mb-4 grid grid-cols-2 gap-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={paymentMethod === m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`grid place-items-center gap-1 rounded-md border py-2.5 text-xs font-semibold transition ${
                    paymentMethod === m.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-text-muted hover:bg-surface-muted"
                  }`}
                >
                  <Icon name={m.icon} className="size-4" />
                  {m.label}
                </button>
              ))}
            </div>
            <dl className="grid gap-3 text-[15px]">
              {[
                ["Subtotal", "Rp41.000"],
                ["Pajak", "Rp4.500"],
                ["Diskon", "-Rp0"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-text-muted">
                  <dt>{label}</dt>
                  <dd className="font-semibold font-mono tabular-nums">{value}</dd>
                </div>
              ))}
              <div className="border-t border-dashed border-border pt-3">
                <div className="flex justify-between text-lg font-semibold text-text">
                  <dt>Total akhir</dt>
                  <dd className="font-mono tabular-nums">Rp45.500</dd>
                </div>
              </div>
            </dl>
            <Button variant="primary" className="checkout-3d mt-4 h-12 w-full text-base">
              Selesaikan transaksi
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
