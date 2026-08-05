import React from "react";
import { StockFilterDrawer } from "../stock/StockFilterDrawer.jsx";
import StockOverview from "../stock/StockOverview.jsx";

const lowStockProducts = [
  { id: "stock-1", name: "Deterjen Bubuk 800g", category: "Rumah Tangga", unit: "pack", stock: 3, active: true },
  { id: "stock-2", name: "Telur Ayam 1kg", category: "Sembako", unit: "kg", stock: 7, active: true },
  { id: "stock-3", name: "Kopi Sachet 10pcs", category: "Minuman", unit: "renteng", stock: 9, active: true },
];

const movementTemplates = [
  {
    id: "movement-1",
    type: "restock",
    productName: "Air Mineral 600ml",
    quantityDelta: 150,
    reason: "Barang masuk",
    createdByUserName: "Dika",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "movement-2",
    type: "sale",
    productName: "Mie Instan Goreng",
    quantityDelta: -12,
    reason: "Penjualan selesai",
    createdByUserName: "Nadia",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "movement-3",
    type: "set_exact",
    productName: "Beras Premium 5kg",
    quantityDelta: -2,
    reason: "Koreksi stok opname",
    createdByUserName: "Dika",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

const movementFixtures = Array.from({ length: 12 }, (_, index) => {
  const template = movementTemplates[index % movementTemplates.length];
  return {
    ...template,
    id: `movement-${index + 1}`,
    createdAt: new Date(Date.now() - (index + 2) * 60 * 60 * 1000).toISOString(),
  };
});

export default function StockPatternsShowcase() {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [movementType, setMovementType] = React.useState("Semua pergerakan");
  const [visibleMovementCount, setVisibleMovementCount] = React.useState(6);

  return (
    <section className="rounded-panel border border-border bg-app-bg p-4 shadow-low">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">Operational pattern</p>
          <h3 className="mt-2 text-xl font-semibold text-text">Stock alerts and recent activity</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
            Stok menipis dan aktivitas terbaru memakai ledger flat bergaya mobile: gambar produk square dengan badge ikon status di kiri atas,
            ritme vertikal yang rapat, gambar produk tanpa badge untuk stok menipis, badge panah aktivitas berwarna solid dengan arah ke bawah saat stok bertambah dan ke atas saat stok keluar, line 5px yang lebih pendek dan ujung membulat, dua baris konteks yang mudah dipindai, delta bertanda beserta satuan di sisi kanan, dan waktu relatif. Filter jenis memakai icon-only bottom drawer yang menyimpan draft sampai Terapkan,
            sama seperti filter Produk. Aksi `Pergerakan baru` tetap menjadi floating action di kanan bawah agar header tetap fokus untuk pencarian. Dialog pergerakan memakai CTA `Simpan` 48px full-pill dengan teks 16px semibold, picker Produk yang terlabel sebagai combobox dengan navigasi keyboard dan radius input standar, preview stok per varian pada surface muted tanpa border tambahan, dan error penyimpanan yang tetap terlihat di dalam dialog. Daftar memenuhi canvas, membedakan hasil filter kosong dari riwayat kosong, mengumumkan jumlah aktivitas yang dimuat secara tersembunyi, melokalkan kegagalan server, dan menambahkan enam aktivitas lewat Muat lebih banyak tanpa footer pagination.
          </p>
        </div>
        <StockFilterDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          type={movementType}
          onTypeChange={setMovementType}
          label="Filter stok contoh"
        />
      </div>
      <div className="w-full">
        <StockOverview
          lowStockProducts={lowStockProducts}
          movements={movementFixtures.slice(0, visibleMovementCount)}
          hasMoreMovements={visibleMovementCount < movementFixtures.length}
          onLoadMore={() => setVisibleMovementCount((count) => Math.min(count + 6, movementFixtures.length))}
        />
      </div>
    </section>
  );
}
