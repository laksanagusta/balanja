import React from "react";
import { Icon } from "../components/primitives.jsx";

const products = [
  { name: "Shampoo Botol 170ml", price: "23.500", stock: "14 pcs" },
  { name: "Susu UHT 1L", price: "19.500", stock: "11 karton" },
  { name: "Air Mineral 600ml", price: "4.000", stock: "48 botol" },
  { name: "Snack Kentang", price: "12.000", stock: "27 pcs" },
  { name: "Deterjen Bubuk 800g", price: "18.000", stock: "20 pack" },
  { name: "Tisu Gulung 10pcs", price: "24.000", stock: "16 pack" },
  { name: "Mie Instan Goreng", price: "3.500", stock: "96 pcs" },
  { name: "Sabun Cuci Piring 750ml", price: "13.500", stock: "22 botol" },
];

const categories = ["Semua", "Minuman", "Snack", "Perawatan", "Rumah Tangga"];

const bottomNavItems = [
  ["Beranda", "home"],
  ["Kasir", "receipt"],
  ["Produk", "box"],
  ["Stok", "package"],
  ["Lainnya", "more"],
];

function ProductImagePlaceholder({ className = "" }) {
  return (
    <div className={`grid place-items-center bg-surface-muted text-text-subtle ${className}`}>
      <Icon name="image" className="size-5" />
    </div>
  );
}

export default function PosProductMockup({ compact = false, cropBottom = false }) {
  const visibleCategories = compact ? categories.slice(0, 3) : categories;
  const visibleProducts = products.slice(0, 4);

  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden bg-app-bg smooth-shadow-ring shadow-black smooth-ring-neutral-300/30 ${
        compact
          ? "mx-auto grid h-full w-full max-w-[34rem] grid-rows-[auto_minmax(0,1fr)] rounded-card text-[9px]"
          : `${cropBottom ? "landing-hero-mockup" : "rounded-panel"} text-[10px] lg:text-[11px]`
      }`}
    >
      <div className="flex items-center gap-1.5 bg-surface-muted px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-text/20" />
        <span className="size-2.5 rounded-full bg-text/12" />
        <span className="size-2.5 rounded-full bg-text/[0.08]" />
      </div>

      <div className={`relative flex min-h-0 ${compact ? "" : "h-[360px] sm:h-[470px] lg:h-[520px]"}`}>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-app-bg">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-base font-extrabold tracking-normal text-text">Kasir</span>
            <div className="flex items-center gap-1">
              <span className="grid size-11 place-items-center rounded-control text-text">
                <Icon name="scan" className="size-5" />
              </span>
              <span className="size-8 rounded-full bg-surface-muted" />
            </div>
          </div>

          <div className="px-4">
            <div className="flex h-11 items-center gap-3 rounded-control border border-border bg-surface px-3.5 shadow-inner-soft">
              <Icon name="search" className="size-4 shrink-0 text-text-muted" />
              <span className="truncate text-text-subtle">Cari produk atau barcode...</span>
            </div>
          </div>

          <div className={`mt-2 flex gap-1 px-4 ${compact ? "" : "flex-wrap"}`}>
            {visibleCategories.map((category, index) => (
              <span
                key={category}
                className={`inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${
                  index === 0 ? "border-accent bg-accent text-white" : "border-border bg-surface text-text"
                }`}
              >
                {category}
              </span>
            ))}
          </div>

          <div className={`product-catalog-grid mt-3 grid p-3 sm:p-4 ${compact ? "grid-cols-2 gap-3 sm:grid-cols-4" : "grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4"}`}>
            {visibleProducts.map((product, index) => (
              <article key={product.name} className={`pos-product-card content-start gap-2 ${!compact && index > 1 ? "hidden sm:grid" : "grid"}`}>
                <div className="relative aspect-square w-full overflow-hidden rounded-panel bg-surface-muted">
                  <ProductImagePlaceholder className="h-full w-full" />
                  <span className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full bg-surface text-text smooth-shadow-ring shadow-black smooth-ring-neutral-300/30">
                    <Icon name="plus" className="size-4" />
                  </span>
                </div>
                <div className="grid gap-1 px-0 pb-0 pt-1">
                  <p className="line-clamp-2 text-[15px] font-medium leading-[1.35] text-text">{product.name}</p>
                  <p className="text-[15px] font-[750] leading-tight tabular-nums text-text">{product.price}</p>
                </div>
              </article>
            ))}
          </div>

          {!compact && (
            <div className="absolute inset-x-0 bottom-16 flex justify-center lg:hidden">
              <span className="inline-flex h-13 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white smooth-shadow-ring shadow-black smooth-ring-neutral-300/30">
                <Icon name="cart" className="size-4" />
                <span>Keranjang</span>
                <span className="grid min-w-5 place-items-center rounded-full bg-white/16 px-1.5 text-xs tabular-nums">4</span>
              </span>
            </div>
          )}

          <nav className={`${compact ? "relative" : "absolute inset-x-0 bottom-0 lg:hidden"} grid grid-cols-5 bg-surface/88 p-1 backdrop-blur-xl`}>
            {bottomNavItems.map(([label, icon], index) => (
              <div
                key={label}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10px] font-semibold ${
                  index === 1 ? "text-accent" : "text-text-muted"
                }`}
              >
                <span className={`grid size-8 place-items-center rounded-full ${index === 1 ? "bg-accent-soft" : ""}`}>
                  <Icon name={icon} className="size-5" />
                </span>
                <span className="max-w-full truncate">{label}</span>
              </div>
            ))}
          </nav>
        </div>

        <aside className={`${compact ? "hidden" : "hidden lg:flex"} w-[240px] shrink-0 flex-col border-l border-border bg-surface p-4 xl:w-[280px]`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">Keranjang</h3>
              <p className="text-text-muted">3 jenis produk</p>
            </div>
            <span className="rounded-full border border-border px-2 py-1 text-text-muted">4 barang</span>
          </div>
          <div className="mt-4 grid gap-3">
            {products.slice(1, 4).map((product, index) => (
              <div key={product.name} className="flex items-center gap-2 pb-3">
                <ProductImagePlaceholder className="size-9 shrink-0 rounded-control" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{product.name}</p>
                  <p className="text-text-muted">{product.price}</p>
                </div>
                <span className="font-mono text-text">{index === 0 ? 1 : index === 1 ? 1 : 2}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-4">
            <div className="flex justify-between text-text-muted"><span>Subtotal</span><span>Rp35.000</span></div>
            <div className="mt-2 flex justify-between text-sm font-semibold text-text"><span>Total pembayaran</span><span>Rp35.000</span></div>
            <div className="mt-4 flex h-11 items-center justify-center rounded-control bg-accent font-semibold text-white">Selesaikan transaksi</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
