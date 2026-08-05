import React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button, Dialog, FieldError, FloatingPopover, Icon, Input, SelectField } from "../components/primitives.jsx";
import { StockPageSkeleton } from "../components/page-loading.jsx";
import BackgroundUpdateStatus from "../components/feedback/BackgroundUpdateStatus.jsx";
import StockOverview from "../components/stock/StockOverview.jsx";
import { StockFilterDrawer } from "../components/stock/StockFilterDrawer.jsx";
import { useCursorTable } from "../hooks/useCursorTable.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatVariantAttributes } from "../pos/domain.js";
import { loadStockMovementPage } from "../pos/store-data.js";
import { calculateStockPreview, parseQuantityInput } from "../stock/movement-preview.js";
import { getLowStockProducts } from "../stock/stock-overview.js";
import { getStockErrorMessage } from "../stock/stock-errors.js";

const movementOptions = ["Tambah stok", "Kurangi stok", "Set stok pasti"];
const movementValueByLabel = {
  "Tambah stok": "restock",
  "Kurangi stok": "reduce",
  "Set stok pasti": "set_exact",
};
const movementFilterValue = {
  "Semua pergerakan": "",
  Penjualan: "sale",
  "Tambah stok": "restock",
  "Kurangi stok": "reduce",
  "Set pasti": "set_exact",
};
const numberFormatter = new Intl.NumberFormat("id-ID");

function formatQuantityInput(value) {
  const parsed = parseQuantityInput(value);
  if (!Number.isFinite(parsed)) return "";
  return numberFormatter.format(parsed);
}

function normalizeQuantityField(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? formatQuantityInput(digits) : "";
}

export default function StockPage() {
  const store = usePOSStore();
  const { activeProducts, loading, loaded, loadProducts, searchProducts, createStockMovement } = store;
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("Semua pergerakan");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogProductId, setDialogProductId] = React.useState("");
  const [dialogVariantId, setDialogVariantId] = React.useState("");
  const [topBarActionsTarget, setTopBarActionsTarget] = React.useState(null);
  const debouncedQuery = useDebouncedValue(query, 220);
  const movementFilters = React.useMemo(() => ({
    q: debouncedQuery.trim(),
    type: movementFilterValue[typeFilter],
  }), [debouncedQuery, typeFilter]);
  const fetchMovementPage = React.useCallback(
    (request) => loadStockMovementPage(store.api, request),
    [store.api],
  );
  const table = useCursorTable({
    fetchPage: fetchMovementPage,
    filters: movementFilters,
    initialSortKey: "createdAt",
    initialSortDir: "desc",
    initialPageSize: 6,
  });

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  React.useEffect(() => {
    setTopBarActionsTarget(document.getElementById("app-top-bar-actions"));
  }, []);

  const lowStockProducts = React.useMemo(() => getLowStockProducts(activeProducts), [activeProducts]);
  const topBarActions = topBarActionsTarget
    ? createPortal(
      <>
        <BackgroundUpdateStatus active={table.isUpdating} label="Memperbarui riwayat stok" />
        <StockFilterDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          type={typeFilter}
          onTypeChange={setTypeFilter}
        />
      </>,
      topBarActionsTarget,
    )
    : null;

  if ((loading.products && !loaded.products) || table.isInitialLoading) {
    return (
      <>
        {topBarActions}
        <StockPageSkeleton />
      </>
    );
  }

  const normalizedQuery = debouncedQuery.trim();
  const hasMovementFilters = Boolean(normalizedQuery || typeFilter !== "Semua pergerakan");
  const resultAnnouncement = table.error
    ? ""
    : `${table.rows.length} aktivitas stok dimuat.`;

  return (
    <>
      {topBarActions}
      <div className="relative flex h-full min-h-0 flex-col bg-surface">
        <header className="px-4 py-3">
          <div className="flex w-full min-w-0 items-center gap-2">
            <div className="mobile-search-control flex h-11 min-w-0 flex-1 items-center gap-3 rounded-control border border-border bg-surface px-3.5 shadow-inner-soft focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus/30">
              <Icon name="search" className="size-4 text-text-muted" />
              <input
                aria-label="Cari aktivitas stok"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
                placeholder="Produk, barcode, kategori"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-app-bg p-4">
          <div className="w-full">
            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
              {resultAnnouncement}
            </div>
            <StockOverview
              lowStockProducts={lowStockProducts}
              products={activeProducts}
              movements={table.rows}
              movementError={table.error}
              onRetry={table.retry}
              hasMoreMovements={table.hasMore}
              loadingMore={table.loading}
              onLoadMore={() => table.error && !table.hasMore ? table.retry() : table.loadMore()}
              hasMovementFilters={hasMovementFilters}
              onResetFilters={() => {
                setQuery("");
                setTypeFilter("Semua pergerakan");
              }}
              onRestock={(product) => {
                setDialogProductId(product.id);
                setDialogVariantId(product.variantId || "");
                setDialogOpen(true);
              }}
            />
          </div>
        </main>

        <button
          type="button"
          aria-label="Pergerakan baru"
          title="Pergerakan baru"
          onClick={() => {
            setDialogProductId("");
            setDialogVariantId("");
            setDialogOpen(true);
          }}
          className="app-shell-floating-action absolute right-4 z-10 grid size-11 place-items-center rounded-full bg-accent text-white shadow-panel hover:bg-accent-hover hover:shadow-panel active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Icon name="plus" className="size-5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </button>

        {dialogOpen && (
          <MovementDialog
            products={activeProducts}
            searchProducts={searchProducts}
            initialProductId={dialogProductId}
            initialVariantId={dialogVariantId}
            onClose={() => {
              setDialogOpen(false);
              setDialogProductId("");
              setDialogVariantId("");
            }}
            onSubmit={async (input) => {
              await createStockMovement(input);
              await table.reset();
              toast.success("Pergerakan stok disimpan");
              setDialogOpen(false);
            }}
          />
        )}
      </div>
    </>
  );
}

function MovementDialog({ products, searchProducts, initialProductId = "", initialVariantId = "", onClose, onSubmit }) {
  const [productId, setProductId] = React.useState(initialProductId || products[0]?.id || "");
  const [selectedVariantId, setSelectedVariantId] = React.useState(initialVariantId);
  const [typeLabel, setTypeLabel] = React.useState("Tambah stok");
  const [quantityText, setQuantityText] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [submitAttempted, setSubmitAttempted] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const product = React.useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const variants = React.useMemo(
    () => (product?.variants || []).filter((variant) => variant.active !== false),
    [product],
  );
  const selectedVariant = React.useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) || null,
    [selectedVariantId, variants],
  );
  React.useEffect(() => {
    setSelectedVariantId((current) => (variants.some((variant) => variant.id === current) ? current : variants[0]?.id || ""));
  }, [variants]);
  const type = movementValueByLabel[typeLabel];
  const quantity = parseQuantityInput(quantityText);
  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const preview = calculateStockPreview({ type, currentStock, quantity });
  const quantityError = getQuantityError({ type, quantityText, quantity, product, currentStock, preview });
  const productError = !product
    ? "Pilih produk aktif."
    : variants.length > 0 && !selectedVariant
      ? "Pilih varian aktif."
      : "";
  const canSubmit = !productError && !quantityError && !isSaving;
  const showErrors = submitAttempted;

  async function submit(event) {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitError("");
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const variantId = selectedVariant?.id;
      await onSubmit({ productId, variantId, type, quantity, reason: reason.trim() });
    } catch (error) {
      setSubmitError(getStockErrorMessage(error, "Pergerakan stok belum tersimpan. Periksa isian lalu coba lagi."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={isSaving ? undefined : onClose}
      size="lg"
      title="Pergerakan stok baru"
      footer={(
        <>
          <Button
            type="submit"
            form="stock-movement-form"
            variant="primary"
            disabled={isSaving}
            size="md"
            className="w-full"
          >
            {isSaving ? "Menyimpan…" : "Simpan"}
          </Button>
        </>
      )}
    >
      <form id="stock-movement-form" onSubmit={submit} className="grid gap-2 text-text">
        <div className="grid gap-2">
          <ProductSearchPicker
            label="Produk"
            products={products}
            searchProducts={searchProducts}
            value={productId}
            onChange={(nextProductId) => {
              setProductId(nextProductId);
              setSelectedVariantId("");
            }}
            error={showErrors ? productError : ""}
            placeholder="Nama produk"
          />
          {variants.length > 0 && (
            <SelectField
              label="Varian"
              value={selectedVariantId}
              options={variants.map((variant) => ({
                value: variant.id,
                label: formatVariantAttributes(variant.attributes) || "Varian utama",
              }))}
              onChange={setSelectedVariantId}
            />
          )}
          <SelectField label="Jenis pergerakan" value={typeLabel} options={movementOptions} onChange={setTypeLabel} />
          <Input
            label={type === "set_exact" ? "Target stok" : "Jumlah"}
            placeholder="1.000"
            error={showErrors ? quantityError : ""}
            inputProps={{
              inputMode: "numeric",
              value: quantityText,
              onChange: (event) => setQuantityText(normalizeQuantityField(event.target.value)),
            }}
          />
          <Input
            label="Alasan (opsional)"
            placeholder="Barang masuk, rusak, koreksi stok opname"
            inputProps={{ value: reason, onChange: (event) => setReason(event.target.value) }}
          />

          {submitError ? (
            <div role="alert" className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium leading-5 text-danger">
              {submitError}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 rounded-card bg-surface-muted p-3">
            <PreviewMetric label="Saat ini" value={numberFormatter.format(currentStock)} />
            <PreviewMetric label="Selisih" value={`${preview.delta > 0 ? "+" : ""}${numberFormatter.format(preview.delta)}`} tone={preview.delta >= 0 ? "success" : "danger"} />
            <PreviewMetric label="Setelah" value={numberFormatter.format(preview.stockAfter)} />
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function ProductSearchPicker({ label, products, searchProducts, value, onChange, error = "", placeholder = "Cari produk" }) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [results, setResults] = React.useState(() => products.slice(0, 6));
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef(null);
  const popoverRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const generatedId = React.useId().replaceAll(":", "");
  const inputId = `${generatedId}-input`;
  const labelId = `${generatedId}-label`;
  const listboxId = `${generatedId}-listbox`;
  const errorId = `${generatedId}-error`;
  const debouncedQuery = useDebouncedValue(query, 220);
  const selectedProduct = React.useMemo(
    () => [...products, ...results].find((item) => item.id === value),
    [products, results, value],
  );
  const optionId = (index) => `${listboxId}-option-${index}`;

  React.useEffect(() => {
    if (!selectedProduct || isOpen) return;
    setQuery(formatProductOption(selectedProduct));
  }, [isOpen, selectedProduct]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const controller = new AbortController();
    async function search() {
      setIsSearching(true);
      setSearchError("");
      const nextProducts = await searchProducts({ q: debouncedQuery.trim(), limit: 6, signal: controller.signal });
      if (!controller.signal.aborted) {
        setResults(nextProducts);
        setActiveIndex(nextProducts.length ? 0 : -1);
        setIsSearching(false);
      }
    }
    search().catch((searchErrorValue) => {
      if (controller.signal.aborted) return;
      setResults([]);
      setActiveIndex(-1);
      setSearchError(getStockErrorMessage(searchErrorValue, "Produk belum dapat dicari. Coba lagi."));
      setIsSearching(false);
    });
    return () => {
      controller.abort();
    };
  }, [debouncedQuery, isOpen, searchProducts]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsidePress = (event) => {
      if (!containerRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [isOpen]);

  function closePicker() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function selectProduct(product) {
    onChange(product.id);
    setQuery(formatProductOption(product));
    closePicker();
  }

  function handleInputKeyDown(event) {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closePicker();
      return;
    }
    if (!isOpen && ["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(results.length ? 0 : -1);
      return;
    }
    if (!isOpen || !results.length) return;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
          : event.key === "End"
            ? results.length - 1
            : event.key === "ArrowDown"
              ? Math.min(results.length - 1, Math.max(-1, activeIndex) + 1)
            : Math.max(0, Math.max(0, activeIndex) - 1);
      setActiveIndex(nextIndex);
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectProduct(results[activeIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative grid gap-2 text-sm font-semibold text-text">
      <label id={labelId} htmlFor={inputId}>{label}</label>
      <div
        className={`mobile-search-control flex h-11 items-center gap-3 rounded-control border bg-surface px-3.5 shadow-inner-soft focus-within:outline-1 focus-within:outline-focus/30 transition-colors duration-base ease-standard motion-reduce:transition-none ${
          error ? "border-danger focus-within:border-danger" : "border-border focus-within:border-border-strong"
        }`}
      >
        <Icon name="search" className="size-4 shrink-0 text-text-muted" />
        <input
          id={inputId}
          ref={inputRef}
          role="combobox"
          aria-labelledby={labelId}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen && !isSearching && !searchError ? listboxId : undefined}
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text outline-none placeholder:text-text-subtle"
          placeholder={placeholder}
          value={query}
          onFocus={() => {
            setIsOpen(true);
            if (activeIndex < 0 && results.length) setActiveIndex(0);
          }}
          onKeyDown={handleInputKeyDown}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
        />
      </div>
      {isOpen && (
        <FloatingPopover
          ref={popoverRef}
          anchorRef={containerRef}
          open
          className="grid max-h-72 gap-1 overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-panel"
        >
          {isSearching ? (
            <div role="status" className="px-3 py-4 text-sm font-medium text-text-muted">Mencari…</div>
          ) : searchError ? (
            <div role="alert" className="px-3 py-4 text-sm font-medium text-danger">{searchError}</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-sm font-medium text-text-muted">Tidak ada produk yang cocok</div>
          ) : (
            <div id={listboxId} role="listbox" aria-labelledby={labelId}>
              {results.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  id={optionId(index)}
                  role="option"
                  aria-selected={product.id === value}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectProduct(product)}
                  className={`grid w-full rounded-button px-3 py-2 text-left transition duration-fast ease-standard hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-focus ${
                    product.id === value || activeIndex === index ? "bg-surface-muted" : ""
                  }`}
                >
                  <span className="truncate text-sm font-semibold text-text">{product.name}</span>
                  <span className="truncate text-xs font-medium text-text-muted">
                    {product.barcode || "Tanpa barcode"} · {product.category || "Tanpa kategori"} · {product.unit || "pcs"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </FloatingPopover>
      )}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

function formatProductOption(product) {
  return product.name;
}

function getQuantityError({ type, quantityText, quantity, product, currentStock, preview }) {
  if (!quantityText) return type === "set_exact" ? "Masukkan target stok." : "Masukkan jumlah.";
  if (type !== "set_exact" && quantity <= 0) return "Jumlah harus lebih dari nol.";
  if (type === "set_exact" && quantity < 0) return "Target stok tidak boleh negatif.";
  if (product && preview.stockAfter < 0) return "Jumlah melebihi stok saat ini.";
  if (type === "set_exact" && product && quantity === currentStock) return "Target stok harus mengubah stok saat ini.";
  if (!preview.isValid) return "Masukkan jumlah stok yang valid.";
  return "";
}

function PreviewMetric({ label, value, tone = "neutral" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text";
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
