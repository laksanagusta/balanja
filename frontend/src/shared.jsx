import React from "react";

export const routes = {
  landing: "/",
  login: "/login",
  dashboard: "/dashboard",
  pos: "/pos",
  products: "/products",
  stock: "/stock",
  transactions: "/transactions",
  reportsSales: "/reports/sales",
  settings: "/settings",
  designSystem: "/design-system",
};

export const navGroups = [
  {
    label: "Ringkasan",
    items: [["Dashboard", "grid", routes.dashboard]],
  },
  {
    label: "Operasional",
    items: [
      ["Kasir", "receipt", routes.pos],
      ["Produk", "box", routes.products],
      ["Stok", "package", routes.stock],
    ],
  },
  {
    label: "Catatan",
    items: [["Transaksi", "file", routes.transactions]],
  },
  {
    label: "Analisis",
    items: [["Laporan Penjualan", "file", routes.reportsSales]],
  },
];

export function Logo() {
  return (
    <div className="flex items-center">
      <span className="text-lg font-bold tracking-normal text-text">Balanja</span>
    </div>
  );
}

export function parsePrice(price) {
  return parseFloat(price.replace(/[^0-9.]/g, ""));
}

export function formatPrice(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(Number(num) || 0)
    .replace(/\s+/g, "");
}
