import React from "react";
import { toast } from "sonner";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { TablePagination } from "../components/TablePagination.jsx";
import { Badge, Button, DataTable, Dialog, Icon, Input, SelectField, Switch } from "../components/primitives.jsx";
import { ProductsPageSkeleton } from "../components/page-loading.jsx";
import { useCursorTable } from "../hooks/useCursorTable.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { parseNumberInput, retailCategories, validateProduct } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";
import { EmptyState } from "../components/feedback/EmptyState.jsx";

function emptyProduct() {
  return { id: "", name: "", barcode: "", category: "Sembako", price: "", stock: 0, unit: "pcs", active: true };
}

function formatNumberInput(value) {
  const parsed = parseNumberInput(value);
  if (!Number.isFinite(parsed)) return "";
  return new Intl.NumberFormat("id-ID").format(parsed);
}

function normalizeNumberField(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? formatNumberInput(digits) : "";
}

export default function ProductsPage() {
  const store = usePOSStore();
  const { loadProducts } = store;
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [editing, setEditing] = React.useState(null);
  const [productErrors, setProductErrors] = React.useState({});
  const [deactivating, setDeactivating] = React.useState(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [savingProduct, setSavingProduct] = React.useState(false);
  const [deactivatingProduct, setDeactivatingProduct] = React.useState(false);
  const debouncedQuery = useDebouncedValue(query, 220);
  const productFilters = React.useMemo(() => ({
    q: debouncedQuery.trim(),
    category,
    active: status ? status === "active" : undefined,
  }), [category, debouncedQuery, status]);
  const fetchProductPage = React.useCallback(
    (request) => store.api.listProducts(request),
    [store.api],
  );
  const table = useCursorTable({
    fetchPage: fetchProductPage,
    filters: productFilters,
    initialSortKey: "createdAt",
    initialSortDir: "desc",
  });

  if (table.isInitialLoading) {
    return <ProductsPageSkeleton />;
  }

  const isProductsMutating = savingProduct || deactivatingProduct;

  const save = async (event) => {
    event.preventDefault();
    if (savingProduct) return;
    const validation = validateProduct(editing, store.products);
    setProductErrors(validation.errors);
    if (!validation.ok) return;

    setSavingProduct(true);
    try {
      const saved = await store.saveProduct(editing);
      if (!saved) {
        toast.error("Gagal menyimpan produk");
        return;
      }
      toast.success(editing.id ? "Produk diperbarui" : "Produk ditambahkan", {
        description: saved.name,
      });
      setEditing(null);
      setProductErrors({});
      await Promise.all([table.refresh(), loadProducts({ force: true })]);
    } finally {
      setSavingProduct(false);
    }
  };

  const updateEditing = (field, value) => {
    const updated = { ...editing, [field]: value };
    setEditing(updated);
    if (productErrors[field]) {
      setProductErrors((current) => ({
        ...current,
        [field]: validateProduct(updated, store.products).errors[field],
      }));
    }
  };

  const deactivate = async () => {
    if (!deactivating || deactivatingProduct) return;
    setDeactivatingProduct(true);
    try {
      const result = await store.deactivateProduct(deactivating.id);
      if (result.ok) {
        toast.success("Produk dinonaktifkan", {
          description: deactivating.name,
        });
        setDeactivating(null);
        await Promise.all([table.refresh(), loadProducts({ force: true })]);
      } else {
        toast.error(result.error || "Gagal menonaktifkan produk");
      }
    } finally {
      setDeactivatingProduct(false);
    }
  };

  const columns = [
    { key: "name", label: "Produk", sortable: true, render: (product) => <span className="font-semibold">{product.name}</span> },
    { key: "barcode", label: "Barcode", render: (product) => <span className="font-mono text-xs text-text-muted">{product.barcode}</span> },
    { key: "category", label: "Kategori", sortable: true },
    { key: "price", label: "Harga", sortable: true, render: (product) => <span className="font-mono font-semibold tabular-nums">{formatPrice(product.price)}</span> },
    {
      key: "stock",
      label: "Stok",
      sortable: true,
      render: (product) => (
        <span className={`font-mono tabular-nums ${product.stock <= 5 ? "font-semibold text-warning" : "text-text"}`}>
          {formatNumberInput(product.stock)}
          <span className="text-text-subtle"> {product.unit}</span>
        </span>
      ),
    },
    { key: "active", label: "Status", render: (product) => <Badge tone={product.active ? "success" : "danger"}>{product.active ? "Aktif" : "Nonaktif"}</Badge> },
    {
      key: "actions",
      label: "Aksi",
      align: "right",
      render: (product) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={isProductsMutating} onClick={() => setEditing(product)}>
            Ubah
          </Button>
          <Button variant="danger" size="sm" disabled={isProductsMutating} onClick={() => setDeactivating(product)}>
            Nonaktifkan
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
        <h1 className="text-base font-semibold text-text">Produk</h1>
        <div className="flex min-w-[220px] flex-1 lg:ml-auto lg:max-w-[420px]">
          <div className="flex h-9 min-w-0 flex-1 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft">
            <Icon name="search" className="size-4 text-text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
              placeholder="Nama, barcode, kategori"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="w-[160px]">
          <SelectField
            label="Kategori"
            hideLabel
            value={category}
            options={[
              { value: "", label: "Semua kategori" },
              ...retailCategories.filter((item) => item !== "Semua").map((item) => ({ value: item, label: item })),
            ]}
            onChange={setCategory}
          />
        </div>
        <div className="w-[130px]">
          <SelectField
            label="Status"
            hideLabel
            value={status}
            options={[
              { value: "", label: "Semua status" },
              { value: "active", label: "Aktif" },
              { value: "inactive", label: "Nonaktif" },
            ]}
            onChange={setStatus}
          />
        </div>
        <Button variant="secondary" className="whitespace-nowrap" disabled={isProductsMutating} onClick={() => setEditing(emptyProduct())}>
          <Icon name="plus" className="size-4" />
          Tambah produk
        </Button>
        {table.isUpdating && <UpdatingBadge />}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid rounded-panel border border-border bg-surface p-0">
          {table.rows.length ? (
            <DataTable
              columns={columns}
              data={table.rows}
              sortKey={table.sortKey}
              sortDir={table.sortDir}
              onSort={table.sortBy}
              className={table.isUpdating ? "opacity-60 transition-opacity duration-base ease-standard" : "transition-opacity duration-base ease-standard"}
            />
          ) : (
            <EmptyState
              icon="search"
              title={table.error ? "Produk gagal dimuat" : "Produk tidak ditemukan"}
              description={table.error ? table.error.message : "Coba nama, barcode, kategori, atau status lain."}
              action={table.error ? (
                <Button size="sm" variant="secondary" onClick={table.retry}>Coba lagi</Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isProductsMutating}
                  onClick={() => { setQuery(""); setCategory(""); setStatus(""); }}
                >
                  Atur ulang filter
                </Button>
              )}
              className="m-4 min-h-[240px]"
            />
          )}
          <TablePagination
            {...table.range}
            pageSize={table.pageSize}
            canPrevious={table.canPrevious}
            canNext={table.canNext}
            onPrevious={table.previous}
            onNext={table.next}
            onPageSizeChange={table.setPageSize}
            loading={table.loading}
          />
        </div>
      </div>

      <Dialog
        open={Boolean(editing)}
        onClose={() => {
          if (savingProduct) return;
          setEditing(null);
          setProductErrors({});
        }}
        title={editing?.id ? "Ubah produk" : "Tambah produk"}
        size="lg"
        footer={
          <>
            <Button type="button" disabled={savingProduct} onClick={() => { setEditing(null); setProductErrors({}); }}>
              Batal
            </Button>
            <Button type="submit" variant="primary" form="product-form" disabled={savingProduct}>
              {savingProduct ? "Menyimpan..." : "Simpan produk"}
            </Button>
          </>
        }
      >
        {editing && (
          <form id="product-form" noValidate onSubmit={save} className="mt-4 grid gap-4 text-text">
            <Input
              label="Nama"
              placeholder="Beras Ramos 5kg"
              error={productErrors.name}
              inputProps={{
                value: editing.name,
                onChange: (event) => updateEditing("name", event.target.value),
                required: true,
                disabled: savingProduct,
              }}
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Input
                label="Barcode"
                placeholder="8991001000011"
                error={productErrors.barcode}
                inputProps={{
                  value: editing.barcode,
                  onChange: (event) => updateEditing("barcode", event.target.value),
                  required: true,
                  disabled: savingProduct,
                }}
              />
              <Button type="button" variant="secondary" disabled={savingProduct} onClick={() => setScannerOpen(true)}>
                <Icon name="barcode" className="size-4" />
                Pindai
              </Button>
            </div>

            <SelectField
              label="Kategori"
              value={editing.category}
              options={retailCategories.filter((item) => item !== "Semua")}
              onChange={(category) => updateEditing("category", category)}
              disabled={savingProduct}
              error={productErrors.category}
            />

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Input
                label="Harga"
                placeholder="72000"
                error={productErrors.price}
                inputProps={{
                  value: formatNumberInput(editing.price),
                  onChange: (event) => updateEditing("price", normalizeNumberField(event.target.value)),
                  inputMode: "numeric",
                  required: true,
                  disabled: savingProduct,
                }}
              />
              <Input
                label="Stok"
                placeholder={editing.id ? "Dikelola oleh transaksi penjualan dan penyesuaian stok" : "18"}
                error={productErrors.stock}
                inputProps={{
                  value: formatNumberInput(editing.stock),
                  onChange: editing.id ? undefined : (event) => updateEditing("stock", normalizeNumberField(event.target.value)),
                  inputMode: "numeric",
                  required: true,
                  disabled: Boolean(editing.id) || savingProduct,
                }}
              />
              {editing.id && (
                <p className="sm:col-span-2 -mt-1 rounded-control bg-surface-muted px-3 py-2 text-xs font-medium leading-5 text-text-muted">
                  Stok diperbarui oleh aktivitas transaksi. Pengubahan stok langsung memang dinonaktifkan pada produk yang sudah ada.
                </p>
              )}
              <Input
                label="Satuan"
                className="sm:col-span-2"
                placeholder="pcs"
                error={productErrors.unit}
                inputProps={{
                  value: editing.unit,
                  onChange: (event) => updateEditing("unit", event.target.value),
                  required: true,
                  disabled: savingProduct,
                }}
              />
            </div>

            <button
              type="button"
              disabled={savingProduct}
              onClick={() => updateEditing("active", !editing.active)}
              className="flex h-10 items-center justify-between rounded-card border border-border bg-surface px-3.5 text-sm font-semibold text-text shadow-inner-soft transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
            >
              <span>Aktif</span>
              <Switch checked={editing.active} tone="success" />
            </button>
          </form>
        )}
      </Dialog>

      <Dialog
        open={Boolean(deactivating)}
        onClose={() => {
          if (!deactivatingProduct) setDeactivating(null);
        }}
        title="Nonaktifkan produk?"
        footer={
          <>
            <Button type="button" disabled={deactivatingProduct} onClick={() => setDeactivating(null)}>Tetap aktif</Button>
            <Button type="button" variant="danger" disabled={deactivatingProduct} onClick={deactivate}>
              {deactivatingProduct ? "Menonaktifkan..." : "Nonaktifkan"}
            </Button>
          </>
        }
      >
        <p className="mt-4">{deactivating?.name} akan dihapus dari katalog produk aktif dan keranjang saat ini.</p>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        title="Pindai barcode produk"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setEditing((current) => ({ ...current, barcode: code }));
          toast.success("Barcode berhasil dipindai", {
            description: code,
          });
          setScannerOpen(false);
        }}
      />
    </div>
  );
}

function UpdatingBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-control border border-border bg-surface-muted px-2.5 text-xs font-semibold text-text-muted">
      <span className="size-1.5 animate-pulse rounded-full bg-accent" />
      Memperbarui
    </span>
  );
}
