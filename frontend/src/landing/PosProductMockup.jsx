import React from "react";
import { Icon } from "../components/primitives.jsx";

const products = [
  { name: "Shampoo Botol 170ml", price: "Rp23.500", stock: "14 pcs", image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80" },
  { name: "Susu UHT 1L", price: "Rp19.500", stock: "11 karton", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80" },
  { name: "Air Mineral 600ml", price: "Rp4.000", stock: "48 botol", image: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80" },
  { name: "Snack Kentang", price: "Rp12.000", stock: "27 pcs", image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80" },
  { name: "Deterjen Bubuk 800g", price: "Rp18.000", stock: "20 pack", image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80" },
  { name: "Tisu Gulung 10pcs", price: "Rp24.000", stock: "16 pack", image: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=600&q=80" },
  { name: "Mie Instan Goreng", price: "Rp3.500", stock: "96 pcs", image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80" },
  { name: "Sabun Cuci Piring 750ml", price: "Rp13.500", stock: "22 botol", image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80" },
];

const sidebarGroups = [
  { label: "Ringkasan", items: [["Dashboard", "grid"]] },
  { label: "Operasional", items: [["Kasir", "receipt"], ["Produk", "box"], ["Stok", "package"]] },
  { label: "Catatan", items: [["Transaksi", "file"]] },
];

export default function PosProductMockup({ compact = false, priority = false }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-t-xl border border-b-0 border-border-strong bg-app-bg shadow-[0_40px_90px_-50px_rgba(0,0,0,0.5)] ${compact ? "text-[9px]" : "text-[10px] lg:text-[11px]"}`}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-muted px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-text/20" />
        <span className="size-2.5 rounded-full bg-text/12" />
        <span className="size-2.5 rounded-full bg-text/[0.08]" />
      </div>

      <div className={`flex ${compact ? "h-[280px]" : "h-[360px] sm:h-[470px] lg:h-[520px]"}`}>
        <aside className="hidden w-[150px] shrink-0 flex-col border-r border-border bg-surface sm:flex lg:w-[185px]">
          <div className="flex items-center gap-2 px-4 py-4">
            <span className="grid size-6 place-items-center rounded-control bg-accent text-white">
              <Icon name="receipt" className="size-3.5" />
            </span>
            <span className="text-xs font-bold text-text">balanja</span>
          </div>
          <nav className="grid gap-2 px-2">
            {sidebarGroups.map((group) => (
              <div key={group.label} className="grid gap-0.5">
                <span className="px-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-text-subtle">{group.label}</span>
                {group.items.map(([label, icon]) => (
                  <div
                    key={label}
                    className={`flex h-7 items-center gap-2 rounded-control px-2.5 font-medium ${label === "Kasir" ? "bg-surface-muted text-text" : "text-text-muted"}`}
                  >
                    <Icon name={icon} className="size-3.5" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-2 border-t border-border px-3 py-3 text-text-muted">
            <span className="size-6 rounded-full bg-[conic-gradient(#f59e0b,#8b5cf6,#06b6d4,#f59e0b)]" />
            <span className="min-w-0 flex-1 truncate">Toko Balanja</span>
            <Icon name="chevron" className="size-3" />
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-app-bg p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-text-muted">Ruang kerja</p>
              <h3 className="text-sm font-semibold text-text sm:text-base">Kasir</h3>
            </div>
            <div className="flex h-8 w-36 items-center gap-2 rounded-card border border-border bg-surface px-2.5 text-text-subtle sm:w-52">
              <Icon name="search" className="size-3.5" />
              <span className="truncate">Cari produk atau barcode...</span>
            </div>
          </div>

          <div className="mt-3 flex gap-1 rounded-card bg-surface-muted p-1 text-text-muted">
            {["Semua", "Minuman", "Snack", "Perawatan", "Rumah Tangga"].map((category, index) => (
              <span key={category} className={`rounded-control px-2.5 py-1.5 ${index === 0 ? "bg-surface font-semibold text-text shadow-low" : ""}`}>
                {category}
              </span>
            ))}
          </div>

          <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4"}`}>
            {products.map((product, index) => (
              <article key={product.name} className="overflow-hidden rounded-card border border-border bg-surface shadow-low">
                <div className="relative h-16 overflow-hidden bg-surface-muted sm:h-24 lg:h-28">
                  <img
                    src={product.image}
                    alt=""
                    loading={priority && index < 4 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={priority && index === 0 ? "high" : "auto"}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-surface/90 px-1.5 py-0.5 text-[8px] font-semibold text-text">{product.stock}</span>
                </div>
                <div className="p-2">
                  <p className="truncate font-semibold text-text">{product.name}</p>
                  <p className="mt-0.5 text-text-muted">{product.price}</p>
                </div>
                <div className="border-t border-border px-2 py-1.5 text-center font-semibold text-text">Tambah ke keranjang</div>
              </article>
            ))}
          </div>
        </div>

        <aside className="hidden w-[235px] shrink-0 flex-col border-l border-border bg-surface p-4 lg:flex xl:w-[280px]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">Keranjang</h3>
              <p className="text-text-muted">3 jenis produk</p>
            </div>
            <span className="rounded-full border border-border px-2 py-1 text-text-muted">4 barang</span>
          </div>
          <div className="mt-4 grid gap-3">
            {products.slice(1, 4).map((product, index) => (
              <div key={product.name} className="flex items-center gap-2 border-b border-border pb-3">
                <img src={product.image} alt="" loading="lazy" decoding="async" className="size-9 rounded-control object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{product.name}</p>
                  <p className="text-text-muted">{product.price}</p>
                </div>
                <span className="font-mono text-text">{index === 0 ? 1 : index === 1 ? 1 : 2}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto border-t border-border pt-4">
            <div className="flex justify-between text-text-muted"><span>Subtotal</span><span>Rp35.000</span></div>
            <div className="mt-2 flex justify-between text-sm font-semibold text-text"><span>Total pembayaran</span><span>Rp35.000</span></div>
            <div className="mt-4 flex h-9 items-center justify-center rounded-control bg-accent font-semibold text-white shadow-accent">Selesaikan transaksi</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
