import React from "react";
import DashboardKpiCard from "../dashboard/DashboardKpiCard.jsx";
import { RevenueTrendPanel, TopProductsPanel } from "../dashboard/DashboardCharts.jsx";
import LowStockPanel from "../dashboard/LowStockPanel.jsx";

const revenueTrend = [82, 104, 96000, 128, 118, 151, 173].map((value, index) => ({
  date: new Date(2026, 6, 4 + index),
  label: `${4 + index} Jul`,
  revenue: value < 1000 ? value * 1000 : value,
}));

const topProducts = [
  { productId: "noodle", label: "Mie Instan", quantity: 42, revenue: 147000 },
  { productId: "water", label: "Air Mineral", quantity: 31, revenue: 124000 },
  { productId: "sugar", label: "Gula Pasir", quantity: 18, revenue: 315000 },
  { productId: "soap", label: "Sabun Mandi", quantity: 14, revenue: 77000 },
  { productId: "rice", label: "Beras Ramos", quantity: 9, revenue: 648000 },
];

const lowStock = [
  { id: "coffee", name: "Kopi Susu", category: "Minuman", unit: "botol", stock: 0 },
  { id: "bread", name: "Roti Cokelat", category: "Makanan", unit: "pcs", stock: 4 },
  { id: "soap", name: "Sabun Mandi", category: "Kebutuhan rumah", unit: "pcs", stock: 8 },
];

export default function DashboardPatternsShowcase() {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Pola dashboard</h3>
      <div className="grid gap-4 rounded-panel border border-border bg-app-bg p-4">
        <p className="text-sm leading-6 text-text-muted">
          Home menempatkan ringkasan, perhatian operasional, dan tindakan lanjutan dalam urutan yang jelas. Pendapatan memakai violet sebagai satu-satunya chart utama,
          produk terlaris memakai ranked list yang menampilkan unit dan nilai tepat, sedangkan analisis metode pembayaran tetap berada di Laporan Penjualan.
          Nilai KPI tidak dipotong, dan stok habis selalu didahulukan dari stok menipis.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 sm:col-span-2 xl:col-span-2">
            <DashboardKpiCard label="Pendapatan" value="Rp786.000" comparison={{ direction: "up", percent: 12.4 }} emphasis />
          </div>
          <DashboardKpiCard label="Transaksi selesai" value="28" comparison={{ direction: "up", percent: 7.7 }} />
          <DashboardKpiCard label="Rata-rata transaksi" value="Rp28.071" comparison={{ direction: "down", percent: -2.3 }} />
        </div>
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-4 xl:col-start-9 xl:row-start-1">
            <LowStockPanel products={lowStock} onManageStock={() => {}} />
          </div>
          <div className="min-w-0 xl:col-span-8 xl:col-start-1 xl:row-start-1">
            <RevenueTrendPanel data={revenueTrend} hasData days={7} />
          </div>
        </div>
        <TopProductsPanel data={topProducts} onViewReport={() => {}} />
      </div>
    </div>
  );
}
