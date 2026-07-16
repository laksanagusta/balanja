import React from "react";
import ReportMetricCard from "../reports/ReportMetricCard.jsx";
import SalesTrendPanel from "../reports/SalesTrendPanel.jsx";
import ReportBreakdownPanels from "../reports/ReportBreakdownPanels.jsx";

const money = (value) => `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
const count = (value) => new Intl.NumberFormat("id-ID").format(value);

export default function ReportPatternsShowcase() {
  const comparison = { absolute: 120000, percent: 12.4, direction: "up" };
  const current = [1, 2, 3, 4, 5, 6, 7].map((day) => ({ bucket: `2026-07-0${day}`, label: `${day} Jul`, totalReceived: 80000 + day * 18000 }));
  const previous = [1, 2, 3, 4, 5, 6, 7].map((day) => ({ bucket: `2026-06-${23 + day}`, label: `${23 + day} Jun`, totalReceived: 70000 + day * 12000 }));
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Pola laporan penjualan</h3>
      <div className="grid gap-4 rounded-panel border border-border bg-app-bg p-4">
        <p className="text-sm leading-6 text-text-muted">Periode WIB, pembanding sama panjang, void terpisah, dan breakdown historis memakai snapshot transaksi.</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ReportMetricCard label="Penjualan bersih" value={money(1086000)} comparison={comparison} formatAbsolute={money} />
          <ReportMetricCard label="Pajak" value={money(119460)} comparison={{ absolute: 0, percent: null, direction: "neutral" }} formatAbsolute={money} />
          <ReportMetricCard label="Total diterima" value={money(1205460)} comparison={comparison} formatAbsolute={money} />
        </div>
        <SalesTrendPanel current={current} previous={previous} />
        <ReportBreakdownPanels
          products={[{ productId: "p1", label: "Mie Instan", quantity: 42, netSales: 147000 }]}
          payments={[{ paymentMethod: "cash", transactionCount: 18, totalReceived: 786000 }, { paymentMethod: "qris", transactionCount: 9, totalReceived: 419460 }]}
          cashiers={[{ cashierUserId: "user-ayu", cashierName: "Ayu", completedTransactions: 16, itemsSold: 38, netSales: 640000, tax: 70400, totalReceived: 710400 }]}
          voids={{ count: 1, originalValue: 18000 }}
          formatMoney={money}
          formatCount={count}
        />
      </div>
    </div>
  );
}
