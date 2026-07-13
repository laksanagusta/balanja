import React from "react";
import { Icon } from "../components/primitives.jsx";

const products = [
  { name: "Kopi Susu", price: "Rp18.000", stock: "24 pcs", image: "/images/hot-americano.png" },
  { name: "Matcha Botol", price: "Rp22.000", stock: "18 pcs", image: "/images/iced-matcha-latte.png" },
  { name: "Roti Bawang", price: "Rp16.000", stock: "31 pcs", image: "/images/garlic-bread-sticks.png" },
  { name: "Nasi Sayur", price: "Rp28.000", stock: "15 pcs", image: "/images/veggie-fried-rice.png" },
];

const sidebarItems = [
  ["Dashboard", "grid"],
  ["POS", "receipt"],
  ["Products", "box"],
  ["Stock", "package"],
  ["Transactions", "file"],
  ["Settings", "settings"],
];

export default function PosProductMockup({ compact = false }) {
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
          <nav className="grid gap-0.5 px-2">
            {sidebarItems.map(([label, icon]) => (
              <div
                key={label}
                className={`flex h-8 items-center gap-2 rounded-control px-2.5 font-medium ${label === "POS" ? "bg-accent text-white" : "text-text-muted"}`}
              >
                <Icon name={icon} className="size-3.5" />
                <span>{label}</span>
              </div>
            ))}
          </nav>
          <div className="mt-auto border-t border-border px-3 py-3 text-text-muted">Toko Balanja</div>
        </aside>

        <main className="min-w-0 flex-1 bg-app-bg p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-text-muted">Workspace</p>
              <h3 className="text-sm font-semibold text-text sm:text-base">Point of Sale</h3>
            </div>
            <div className="flex h-8 w-36 items-center gap-2 rounded-card border border-border bg-surface px-2.5 text-text-subtle sm:w-52">
              <Icon name="search" className="size-3.5" />
              <span className="truncate">Search products or barcode...</span>
            </div>
          </div>

          <div className="mt-3 flex gap-1 rounded-card bg-surface-muted p-1 text-text-muted">
            {["Semua", "Minuman", "Makanan", "Snack"].map((category, index) => (
              <span key={category} className={`rounded-control px-2.5 py-1.5 ${index === 0 ? "bg-surface font-semibold text-text shadow-low" : ""}`}>
                {category}
              </span>
            ))}
          </div>

          <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4"}`}>
            {products.map((product) => (
              <article key={product.name} className="overflow-hidden rounded-card border border-border bg-surface shadow-low">
                <div className="relative h-16 overflow-hidden bg-surface-muted sm:h-24 lg:h-28">
                  <img src={product.image} alt="" className="h-full w-full object-cover" />
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-surface/90 px-1.5 py-0.5 text-[8px] font-semibold text-text">{product.stock}</span>
                </div>
                <div className="p-2">
                  <p className="truncate font-semibold text-text">{product.name}</p>
                  <p className="mt-0.5 text-text-muted">{product.price}</p>
                </div>
                <div className="border-t border-border px-2 py-1.5 text-center font-semibold text-text">Add to cart</div>
              </article>
            ))}
          </div>
        </main>

        <aside className="hidden w-[235px] shrink-0 flex-col border-l border-border bg-surface p-4 lg:flex xl:w-[280px]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">Cart</h3>
              <p className="text-text-muted">2 item types</p>
            </div>
            <span className="rounded-full border border-border px-2 py-1 text-text-muted">3 items</span>
          </div>
          <div className="mt-4 grid gap-3">
            {products.slice(0, 2).map((product, index) => (
              <div key={product.name} className="flex items-center gap-2 border-b border-border pb-3">
                <img src={product.image} alt="" className="size-9 rounded-control object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{product.name}</p>
                  <p className="text-text-muted">{product.price}</p>
                </div>
                <span className="font-mono text-text">{index + 1}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto border-t border-border pt-4">
            <div className="flex justify-between text-text-muted"><span>Subtotal</span><span>Rp62.000</span></div>
            <div className="mt-2 flex justify-between text-sm font-semibold text-text"><span>Total Payment</span><span>Rp62.000</span></div>
            <div className="mt-4 flex h-9 items-center justify-center rounded-control bg-accent font-semibold text-white shadow-accent">Complete sale</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
