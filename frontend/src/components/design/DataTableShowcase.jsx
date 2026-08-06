import React from "react";
import BackgroundUpdateStatus from "../feedback/BackgroundUpdateStatus.jsx";
import { Button, Icon } from "../primitives.jsx";
import { transactionData, inventoryData } from "../../data.js";
import { sortRows } from "../../lib/sorting.js";
import { ProductFilterDrawer } from "../product/ProductFilterDrawer.jsx";
import { ProductList } from "../product/ProductList.jsx";
import { TransactionCardList } from "../transactions/TransactionCardList.jsx";
import { TransactionFilterDrawer } from "../transactions/TransactionFilterDrawer.jsx";
import { TransactionReceiptDrawer } from "../transactions/TransactionReceiptDrawer.jsx";

const serverRows = Array.from({ length: 48 }, (_, index) => {
  const row = transactionData[index % transactionData.length];
  const productCount = Math.min(row.items, 5);
  return {
    ...row,
    id: `${row.id}-${index + 1}`,
    number: `${row.id}-${index + 1}`,
    createdAt: `2026-07-30T${row.time}:00+07:00`,
    items: Array.from({ length: productCount }, (_, itemIndex) => {
      const product = inventoryData[(index + itemIndex) % inventoryData.length];
      return {
        productId: product.sku,
        name: product.name,
        image: product.image,
        qty: itemIndex === 0 ? row.items - productCount + 1 : 1,
      };
    }),
    paymentMethod: row.payment.toLowerCase(),
    cashierName: row.cashier,
  };
});

export default function DataTableShowcase() {
  const [sortKey, setSortKey] = React.useState("createdAt");
  const [sortDir, setSortDir] = React.useState("desc");
  const [visibleTransactionCount, setVisibleTransactionCount] = React.useState(6);
  const [updating, setUpdating] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [payment, setPayment] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [productCategory, setProductCategory] = React.useState("");
  const [productStatus, setProductStatus] = React.useState("");
  const [productSort, setProductSort] = React.useState("createdAt:desc");
  const [productFiltersOpen, setProductFiltersOpen] = React.useState(false);
  const [visibleProductCount, setVisibleProductCount] = React.useState(6);
  const [enteringProductIds, setEnteringProductIds] = React.useState([]);

  const filtered = payment ? serverRows.filter((row) => row.paymentMethod === payment) : serverRows;
  const sorted = sortRows(filtered, sortKey, sortDir, {
    number: { type: "string" },
    createdAt: { type: "string" },
    total: { type: "number" },
  });
  const rows = sorted.slice(0, visibleTransactionCount);

  React.useEffect(() => setVisibleTransactionCount(6), [dateFrom, dateTo, payment, sortDir, sortKey]);
  React.useEffect(() => {
    if (enteringProductIds.length === 0) return undefined;
    const timeout = window.setTimeout(() => setEnteringProductIds([]), 220);
    return () => window.clearTimeout(timeout);
  }, [enteringProductIds]);

  const loadMoreProducts = () => {
    const nextProducts = inventoryData.slice(visibleProductCount, visibleProductCount + 6);
    setEnteringProductIds(nextProducts.map((product) => product.sku));
    setVisibleProductCount((count) => count + 6);
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Transaction cards</h3>
      <p className="mb-3 max-w-3xl text-sm leading-6 text-text-muted">
        Kartu transaksi menyertakan metadata yang dapat dibaca assistive technology, filter tetap tersedia selama loading,
        dan drawer rincian menampilkan kasir serta metode pembayaran tanpa memotong nama produk. Frame receipt memakai
        radius concentric responsif 24px/28px terhadap paper 16px dengan inset 8px/12px.
      </p>
      <div className="mb-2 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-text">Transaksi</p>
          <TransactionFilterDrawer
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            label="Filter transaksi contoh"
            sort={`${sortKey}:${sortDir}`}
            onSortChange={(value) => {
              const [nextSortKey, nextSortDir] = value.split(":");
              setSortKey(nextSortKey);
              setSortDir(nextSortDir);
            }}
            paymentMethod={payment}
            onPaymentMethodChange={setPayment}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
          />
        </div>
        <div className="flex w-full min-w-0">
          <div className="mobile-search-control flex h-11 min-w-0 flex-1 items-center gap-3 rounded-card bg-surface px-3.5 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/20 focus-within:outline-1 focus-within:outline-focus/30">
            <Icon name="search" className="size-4 text-text-muted" />
            <input
              aria-label="Cari transaksi contoh"
              name="transaction-showcase-search"
              type="search"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
              placeholder="Transaksi, kasir, pembayaran"
            />
          </div>
        </div>
        <BackgroundUpdateStatus active={updating} label="Memperbarui contoh tabel" />
        <Button size="sm" variant="ghost" onClick={() => setUpdating((value) => !value)}>
          {updating ? "Selesai" : "Perbarui"}
        </Button>
      </div>
      <div>
        <TransactionCardList
          transactions={rows}
          formatDate={(value) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))}
          onSelect={setSelectedTransaction}
        />
        {visibleTransactionCount < sorted.length && (
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              className="min-w-36"
              onClick={() => setVisibleTransactionCount((count) => count + 6)}
            >
              Muat lebih banyak
            </Button>
          </div>
        )}
      </div>
      <TransactionReceiptDrawer transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
      <div className="mt-6 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-text">Product list</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              Di produksi, trigger filter icon-only ditempatkan di shared top bar. Frame daftar memakai radius panel 16px dan thumbnail control 10px agar sudut nested tetap rapi.
            </p>
          </div>
          <ProductFilterDrawer
            open={productFiltersOpen}
            onOpenChange={setProductFiltersOpen}
            label="Filter produk contoh"
            sort={productSort}
            onSortChange={setProductSort}
            category={productCategory}
            categoryOptions={[
              { value: "", label: "Semua kategori" },
              { value: "food", label: "Makanan" },
              { value: "drink", label: "Minuman" },
            ]}
            onCategoryChange={setProductCategory}
            status={productStatus}
            onStatusChange={setProductStatus}
          />
        </div>
        <div className="flex w-full min-w-0 items-center gap-2">
          <div className="mobile-search-control flex h-11 min-w-0 flex-1 items-center gap-3 rounded-card bg-surface px-3.5 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/20 focus-within:outline-1 focus-within:outline-focus/30">
            <Icon name="search" className="size-4 text-text-muted" />
            <input
              aria-label="Cari produk contoh"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
              placeholder="Nama, barcode, kategori"
            />
          </div>
          <button
            type="button"
            aria-label="Tambah produk contoh"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white transition-[background-color,transform] duration-fast ease-standard hover:bg-accent-hover active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Icon name="plus" className="size-5" />
          </button>
        </div>
      </div>
      <div className="mt-2 grid w-full overflow-hidden rounded-panel border border-border bg-surface">
        <ProductList
          products={inventoryData.slice(0, visibleProductCount).map((product) => ({
            ...product,
            id: product.sku,
            barcode: product.sku,
            active: true,
          }))}
          priceField="cost"
          enteringIds={enteringProductIds}
        />
      </div>
      {visibleProductCount < inventoryData.length && (
        <Button
          type="button"
          variant="secondary"
          className="mx-auto mt-3 min-w-36"
          onClick={loadMoreProducts}
        >
          Muat lebih banyak
        </Button>
      )}
    </div>
  );
}
