import React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { Button, Dialog, Icon, Input, Switch } from "../components/primitives.jsx";
import { ProductsPageSkeleton } from "../components/page-loading.jsx";
import { useCursorTable } from "../hooks/useCursorTable.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { parseNumberInput, validateProduct } from "../pos/domain.js";
import { activeMasterOptions, resolveMasterName } from "../pos/master-data.js";
import { usePOSStore } from "../pos/store.jsx";
import { EmptyState } from "../components/feedback/EmptyState.jsx";
import BackgroundUpdateStatus from "../components/feedback/BackgroundUpdateStatus.jsx";
import { SwapText } from "../components/motion/SwapText.jsx";
import { ProductList } from "../components/product/ProductList.jsx";
import MasterDataSelectField from "../components/product/MasterDataSelectField.jsx";
import { ProductFilterDrawer } from "../components/product/ProductFilterDrawer.jsx";
import { ProductPhotoField } from "../components/product/ProductPhotoField.jsx";
import { validateProductPhoto } from "../components/product/product-photo.js";
import { primeScanSuccessSound } from "../preferences/scan-feedback.js";

function emptyProduct(categoryId = "", unitId = "") {
  return { id: "", name: "", barcode: "", categoryId, unitId, price: "", stock: 0, image: "", imageFile: null, removeImage: false, active: true };
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
  const { loadCategories, loadProducts, loadUnits } = store;
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [productErrors, setProductErrors] = React.useState({});
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [savingProduct, setSavingProduct] = React.useState(false);
  const [photoPreviewURL, setPhotoPreviewURL] = React.useState("");
  const [enteringProductIds, setEnteringProductIds] = React.useState([]);
  const [topBarActionsTarget, setTopBarActionsTarget] = React.useState(null);
  const debouncedQuery = useDebouncedValue(query, 220);
  const productFilters = React.useMemo(() => ({
    q: debouncedQuery.trim(),
    categoryId,
    active: status ? status === "active" : undefined,
  }), [categoryId, debouncedQuery, status]);
  const categoryOptions = React.useMemo(
    () => [{ value: "", label: "Semua kategori" }, ...activeMasterOptions(store.categories)],
    [store.categories],
  );
  const unitOptions = React.useMemo(
    () => activeMasterOptions(store.units),
    [store.units],
  );
  const defaultCategoryId = categoryOptions[1]?.value || "";
  const defaultUnitId = unitOptions[0]?.value || "";
  const fetchProductPage = React.useCallback(
    (request) => store.api.listProducts(request),
    [store.api],
  );
  const table = useCursorTable({
    fetchPage: fetchProductPage,
    filters: productFilters,
    initialSortKey: "createdAt",
    initialSortDir: "desc",
    initialPageSize: 6,
  });

  React.useEffect(() => () => {
    if (photoPreviewURL) {
      window.setTimeout(() => URL.revokeObjectURL(photoPreviewURL), 200);
    }
  }, [photoPreviewURL]);

  React.useEffect(() => {
    if (enteringProductIds.length === 0) return undefined;
    const timeout = window.setTimeout(() => setEnteringProductIds([]), 220);
    return () => window.clearTimeout(timeout);
  }, [enteringProductIds]);

  React.useEffect(() => {
    loadCategories();
    loadUnits();
  }, [loadCategories, loadUnits]);

  React.useEffect(() => {
    setTopBarActionsTarget(document.getElementById("app-top-bar-actions"));
  }, []);

  if (table.isInitialLoading) {
    return <ProductsPageSkeleton />;
  }

  const isProductsMutating = savingProduct;

  const closeEditor = () => {
    setPhotoPreviewURL("");
    setEditing(null);
    setProductErrors({});
  };

  const openEditor = (product) => {
    setPhotoPreviewURL("");
    setEditing({ ...product, imageFile: null, removeImage: false });
    setProductErrors({});
  };

  const selectPhoto = (file) => {
    const error = file ? validateProductPhoto(file) : "";
    setProductErrors((current) => ({ ...current, image: error }));
    if (error || !file) return;
    setPhotoPreviewURL(URL.createObjectURL(file));
    setEditing((current) => ({ ...current, imageFile: file, removeImage: false }));
  };

  const removePhoto = () => {
    setPhotoPreviewURL("");
    setEditing((current) => ({ ...current, imageFile: null, removeImage: true }));
    setProductErrors((current) => ({ ...current, image: "" }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (savingProduct) return;
    const validation = validateProduct(editing, store.products);
    setProductErrors(validation.errors);
    if (!validation.ok) return;

    setSavingProduct(true);
    try {
      const saved = await store.saveProduct(editing, { throwOnError: true });
      if (!saved) {
        toast.error("Gagal menyimpan produk");
        return;
      }
      toast.success(editing.id ? "Produk diperbarui" : "Produk ditambahkan", {
        description: saved.name,
      });
      closeEditor();
      await Promise.all([table.reset(), loadProducts({ force: true })]);
    } catch (error) {
      const imageMessages = {
        INVALID_IMAGE: "Gunakan file JPG, PNG, atau WebP yang valid.",
        IMAGE_TOO_LARGE: "Ukuran foto maksimal 5 MB.",
        IMAGE_STORAGE_UNAVAILABLE: "Penyimpanan foto sedang tidak tersedia. Coba lagi.",
      };
      if (imageMessages[error?.code]) {
        setProductErrors((current) => ({ ...current, image: imageMessages[error.code] }));
      } else {
        toast.error(error?.message || "Failed to save product");
      }
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

  const loadMoreProducts = async () => {
    const page = await table.loadMore();
    const nextIds = (page?.items || [])
      .map((product) => product.id || product.sku)
      .filter(Boolean);
    setEnteringProductIds(nextIds);
  };

  const topBarActions = topBarActionsTarget
    ? createPortal(
      <>
        <BackgroundUpdateStatus active={table.isUpdating} label="Memperbarui daftar produk" />
        <ProductFilterDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          label="Filter produk"
          sort={`${table.sortKey}:${table.sortDir}`}
          onSortChange={(nextSort) => {
            const [sortKey, sortDir] = nextSort.split(":");
            table.setSort(sortKey, sortDir);
          }}
          category={categoryId}
          categoryOptions={categoryOptions}
          onCategoryChange={setCategoryId}
          status={status}
          onStatusChange={setStatus}
        />
      </>,
      topBarActionsTarget,
    )
    : null;

  return (
    <>
      {topBarActions}
      <div className="flex h-full min-h-0 flex-col bg-surface">
        <header className="px-4 py-3">
          <div className="grid w-full">
            <div className="flex w-full min-w-0 items-center gap-2">
              <div className="mobile-search-control flex h-11 min-w-0 flex-1 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus/30">
                <Icon name="search" className="size-4 text-text-muted" />
                <input
                  aria-label="Cari produk"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
                  placeholder="Nama, barcode, kategori"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <button
                type="button"
                aria-label="Tambah produk"
                title="Tambah produk"
                disabled={isProductsMutating}
                onClick={() => openEditor(emptyProduct(defaultCategoryId, defaultUnitId))}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white transition-[background-color,transform] duration-fast ease-standard hover:bg-accent-hover active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
              >
                <Icon name="plus" className="size-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="grid w-full gap-3">
            <div className="overflow-hidden rounded-panel border border-border bg-surface">
              {table.rows.length ? (
                <ProductList
                  products={table.rows}
                  disabled={isProductsMutating}
                  onSelect={openEditor}
                  getCategory={(product) => resolveMasterName(store.categories, product.categoryId, product.category)}
                  getUnit={(product) => resolveMasterName(store.units, product.unitId, product.unit)}
                  enteringIds={enteringProductIds}
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
                      onClick={() => { setQuery(""); setCategoryId(""); setStatus(""); }}
                    >
                      Atur ulang filter
                    </Button>
                  )}
                  className="m-4 min-h-[240px]"
                />
              )}
            </div>
            {(table.hasMore || (table.error && table.rows.length > 0)) && (
              <Button
                type="button"
                variant="secondary"
                className="mx-auto min-w-36"
                disabled={table.loading}
                onClick={loadMoreProducts}
              >
                {table.loading ? "Memuat..." : table.error ? "Coba lagi" : "Muat lebih banyak"}
              </Button>
            )}
          </div>
        </div>

      <Dialog
        open={Boolean(editing)}
        onClose={() => {
          if (savingProduct) return;
          closeEditor();
        }}
        title={editing?.id ? "Ubah produk" : "Tambah produk"}
        size="lg"
        footer={
          <>
            <Button type="button" disabled={savingProduct} onClick={closeEditor}>
              Batal
            </Button>
            <Button type="submit" variant="primary" form="product-form" disabled={savingProduct} className="min-w-32">
              <SwapText value={savingProduct ? "Menyimpan..." : "Simpan produk"} />
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

            <ProductPhotoField
              product={{ ...editing, image: editing.removeImage ? "" : editing.image }}
              previewURL={photoPreviewURL}
              filename={editing.imageFile?.name}
              error={productErrors.image}
              disabled={savingProduct}
              onSelect={selectPhoto}
              onRemove={removePhoto}
            />

            <div className="grid gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={savingProduct}
                onClick={() => {
                  void primeScanSuccessSound();
                  setScannerOpen(true);
                }}
                className="w-full"
              >
                <Icon name="scan" className="size-5" />
                Pindai barcode
              </Button>
              <Input
                label="Barcode"
                placeholder="8991001000011"
                error={productErrors.barcode}
                inputClassName="font-mono tabular-nums tracking-[0.01em]"
                inputProps={{
                  value: editing.barcode,
                  onChange: (event) => updateEditing("barcode", event.target.value),
                  required: true,
                  disabled: savingProduct,
                }}
              />
            </div>

            <MasterDataSelectField
              entityLabel="Kategori"
              value={editing.categoryId}
              items={store.categories}
              onChange={(nextCategoryId) => updateEditing("categoryId", nextCategoryId)}
              onCreate={store.createCategory}
              onRestore={store.restoreCategory}
              disabled={savingProduct}
              error={productErrors.categoryId}
            />

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Input
                label="Harga"
                placeholder="72000"
                error={productErrors.price}
                inputClassName="font-mono tabular-nums"
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
                inputClassName="font-mono tabular-nums"
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
              <div className="sm:col-span-2">
                <MasterDataSelectField
                  entityLabel="Satuan"
                  value={editing.unitId}
                  items={store.units}
                  onChange={(nextUnitId) => updateEditing("unitId", nextUnitId)}
                  onCreate={store.createUnit}
                  onRestore={store.restoreUnit}
                  disabled={savingProduct}
                  error={productErrors.unitId}
                />
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={editing.active}
              disabled={savingProduct}
              onClick={() => updateEditing("active", !editing.active)}
              className="flex h-10 items-center justify-between rounded-button border border-border bg-surface px-3.5 text-sm font-semibold text-text shadow-inner-soft transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
            >
              <span>Aktif</span>
              <Switch checked={editing.active} tone="success" decorative />
            </button>
          </form>
        )}
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        title="Pindai barcode produk"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setEditing((current) => ({ ...current, barcode: code }));
          return {
            ok: true,
            message: "Barcode berhasil dipindai",
            description: code,
            close: true,
          };
        }}
      />
      </div>
    </>
  );
}
