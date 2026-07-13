import React from "react";
import { toast } from "sonner";
import { TablePagination } from "../components/TablePagination.jsx";
import { Badge, Button, DataTable, Dialog, Icon, Input, Panel, SelectField } from "../components/primitives.jsx";
import { StockPageSkeleton } from "../components/page-loading.jsx";
import { useCursorTable } from "../hooks/useCursorTable.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { usePOSStore } from "../pos/store.jsx";
import { loadStockMovementPage } from "../pos/store-data.js";
import { calculateStockPreview, parseQuantityInput } from "../stock/movement-preview.js";

const movementOptions = ["Restock", "Reduce", "Set exact stock"];
const movementValueByLabel = {
  Restock: "restock",
  Reduce: "reduce",
  "Set exact stock": "set_exact",
};
const movementLabelByValue = {
  sale: "Sale",
  restock: "Restock",
  reduce: "Reduce",
  set_exact: "Set exact",
};
const movementFilterOptions = ["All movements", "Sale", "Restock", "Reduce", "Set exact"];
const movementFilterValue = {
  "All movements": "",
  Sale: "sale",
  Restock: "restock",
  Reduce: "reduce",
  "Set exact": "set_exact",
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
  const [typeFilter, setTypeFilter] = React.useState("All movements");
  const [dialogOpen, setDialogOpen] = React.useState(false);
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
  });

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const columns = React.useMemo(() => [
    { key: "createdAt", label: "Date", sortable: true, render: (row) => formatDate(row.createdAt) },
    {
      key: "productName",
      label: "Product",
      sortable: true,
      render: (row) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-text">{row.productName}</p>
          <p className="text-xs text-text-muted">{row.productBarcode || row.productCategory || "No barcode"}</p>
        </div>
      ),
    },
    { key: "type", label: "Type", sortable: true, render: (row) => <MovementBadge type={row.type} /> },
    {
      key: "quantityDelta",
      label: "Delta",
      align: "right",
      sortable: true,
      render: (row) => (
        <span className={`font-mono font-semibold tabular-nums ${row.quantityDelta > 0 ? "text-success" : "text-danger"}`}>
          {row.quantityDelta > 0 ? "+" : ""}{numberFormatter.format(row.quantityDelta)}
        </span>
      ),
    },
    {
      key: "stockAfter",
      label: "Before - After",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm tabular-nums text-text-muted">
          {numberFormatter.format(row.stockBefore)} - {numberFormatter.format(row.stockAfter)}
        </span>
      ),
    },
    { key: "reason", label: "Reason", render: (row) => <span className="line-clamp-2 max-w-[240px]">{row.reason}</span> },
    { key: "createdByUserId", label: "User", render: (row) => <span className="text-xs text-text-muted">{row.createdByUserId}</span> },
    { key: "referenceType", label: "Reference", render: (row) => row.referenceType || "Manual" },
  ], []);
  if ((loading.products && !loaded.products) || table.isInitialLoading) return <StockPageSkeleton />;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="grid gap-3 border-b border-border px-6 py-3 lg:grid-cols-[auto_1fr_auto_auto] lg:items-center">
        <h1 className="text-base font-semibold text-text">Stock</h1>
        <div className="flex w-full min-w-0 lg:ml-auto lg:w-[420px]">
          <div className="flex h-9 min-w-0 flex-1 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft">
            <Icon name="search" className="size-4 text-text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
              placeholder="Product, barcode, category"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="w-full lg:w-[220px]">
          <SelectField
            label="Type"
            hideLabel
            value={typeFilter}
            options={movementFilterOptions}
            onChange={setTypeFilter}
          />
        </div>
        <Button variant="secondary" className="whitespace-nowrap lg:justify-self-end" onClick={() => setDialogOpen(true)}>
          <Icon name="plus" className="size-4" />
          New movement
        </Button>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-4">
        <Panel className="overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text">Movement history</h2>
                <p className="text-sm text-text-muted">Semua perubahan stock tercatat append-only.</p>
              </div>
              {table.isUpdating && (
                <span className="inline-flex h-7 items-center gap-2 rounded-control border border-border bg-surface-muted px-2.5 text-xs font-semibold text-text-muted">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                  Updating
                </span>
              )}
            </div>
          </div>
          {table.rows.length === 0 ? (
            <div className="grid place-items-center gap-2 px-4 py-12 text-center">
              <Icon name={table.error ? "help" : "package"} className="size-9 text-text-subtle" />
              <p className="font-semibold text-text">{table.error ? "Stock movements could not be loaded" : "No stock movements yet"}</p>
              <p className="max-w-md text-sm text-text-muted">
                {table.error ? table.error.message : "Buat manual movement atau complete sale untuk mengisi history."}
              </p>
              {table.error && <Button size="sm" variant="secondary" onClick={table.retry}>Retry</Button>}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={table.rows}
              sortKey={table.sortKey}
              sortDir={table.sortDir}
              onSort={table.sortBy}
              className={table.isUpdating ? "opacity-60 transition-opacity duration-base ease-standard" : "transition-opacity duration-base ease-standard"}
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
        </Panel>
      </main>

      {dialogOpen && (
        <MovementDialog
          products={activeProducts}
          searchProducts={searchProducts}
          onClose={() => setDialogOpen(false)}
          onSubmit={async (input) => {
            const result = await createStockMovement(input);
            if (result) {
              await table.refresh();
              toast.success("Stock movement saved");
              setDialogOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}

function MovementBadge({ type }) {
  const tone = type === "restock" ? "success" : type === "reduce" ? "danger" : type === "sale" ? "warning" : "neutral";
  return <Badge tone={tone}>{movementLabelByValue[type] || type}</Badge>;
}

function MovementDialog({ products, searchProducts, onClose, onSubmit }) {
  const [productId, setProductId] = React.useState(products[0]?.id || "");
  const [typeLabel, setTypeLabel] = React.useState("Restock");
  const [quantityText, setQuantityText] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [submitAttempted, setSubmitAttempted] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const product = React.useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const type = movementValueByLabel[typeLabel];
  const quantity = parseQuantityInput(quantityText);
  const preview = calculateStockPreview({ type, currentStock: product?.stock || 0, quantity });
  const quantityError = getQuantityError({ type, quantityText, quantity, product, preview });
  const reasonError = !reason.trim() ? "Reason is required for the audit trail." : "";
  const productError = !product ? "Select an active product." : "";
  const canSubmit = !productError && !quantityError && !reasonError && !isSaving;
  const showErrors = submitAttempted;

  async function submit(event) {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      await onSubmit({ productId, type, quantity, reason: reason.trim() });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={isSaving ? undefined : onClose}
      size="lg"
      title="New stock movement"
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" form="stock-movement-form" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save movement"}
          </Button>
        </>
      )}
    >
      <form id="stock-movement-form" onSubmit={submit} className="grid gap-4 text-text">
        <p className="text-sm text-text-muted">Reason wajib karena setiap movement menjadi audit trail.</p>
        <div className="grid gap-4">
          <ProductSearchPicker
            label="Product"
            products={products}
            searchProducts={searchProducts}
            value={productId}
            onChange={setProductId}
            error={showErrors ? productError : ""}
            placeholder="Search product, barcode, category"
          />
          <SelectField label="Movement type" value={typeLabel} options={movementOptions} onChange={setTypeLabel} />
          <Input
            label={type === "set_exact" ? "Target stock" : "Quantity"}
            placeholder="1.000"
            error={showErrors ? quantityError : ""}
            inputProps={{
              inputMode: "numeric",
              value: quantityText,
              onChange: (event) => setQuantityText(normalizeQuantityField(event.target.value)),
            }}
          />
          <Input
            label="Reason"
            placeholder="Barang masuk, rusak, koreksi stock opname"
            error={showErrors ? reasonError : ""}
            inputProps={{ value: reason, onChange: (event) => setReason(event.target.value) }}
          />

          <div className="grid grid-cols-3 gap-3 rounded-card border border-border bg-surface-muted p-3">
            <PreviewMetric label="Current" value={numberFormatter.format(product?.stock || 0)} />
            <PreviewMetric label="Delta" value={`${preview.delta > 0 ? "+" : ""}${numberFormatter.format(preview.delta)}`} tone={preview.delta >= 0 ? "success" : "danger"} />
            <PreviewMetric label="After" value={numberFormatter.format(preview.stockAfter)} />
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function ProductSearchPicker({ label, products, searchProducts, value, onChange, error = "", placeholder = "Search product" }) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [results, setResults] = React.useState(() => products.slice(0, 6));
  const [isSearching, setIsSearching] = React.useState(false);
  const debouncedQuery = useDebouncedValue(query, 220);
  const selectedProduct = React.useMemo(
    () => [...products, ...results].find((item) => item.id === value),
    [products, results, value],
  );

  React.useEffect(() => {
    if (!selectedProduct || isOpen) return;
    setQuery(formatProductOption(selectedProduct));
  }, [isOpen, selectedProduct]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const controller = new AbortController();
    async function search() {
      setIsSearching(true);
      const nextProducts = await searchProducts({ q: debouncedQuery.trim(), limit: 6, signal: controller.signal });
      if (!controller.signal.aborted) {
        setResults(nextProducts);
        setIsSearching(false);
      }
    }
    search();
    return () => {
      controller.abort();
    };
  }, [debouncedQuery, isOpen, searchProducts]);

  return (
    <div className="relative grid gap-2 text-sm font-semibold text-text">
      <span>{label}</span>
      <div
        className={`flex h-10 items-center gap-3 rounded-card border bg-surface px-3.5 shadow-inner-soft focus-within:outline-2 focus-within:outline-focus/30 ${
          error ? "border-danger focus-within:border-danger" : "border-border focus-within:border-border-strong"
        }`}
      >
        <Icon name="search" className="size-4 shrink-0 text-text-muted" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text outline-none placeholder:text-text-subtle"
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
        />
      </div>
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 grid max-h-72 gap-1 overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-panel">
          {isSearching ? (
            <div className="px-3 py-4 text-sm font-medium text-text-muted">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-sm font-medium text-text-muted">No matching products</div>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  onChange(product.id);
                  setQuery(formatProductOption(product));
                  setIsOpen(false);
                }}
                className={`grid rounded-control px-3 py-2 text-left transition duration-fast ease-standard hover:bg-surface-muted ${
                  product.id === value ? "bg-surface-muted" : ""
                }`}
              >
                <span className="truncate text-sm font-semibold text-text">{product.name}</span>
                <span className="truncate text-xs font-medium text-text-muted">
                  {product.barcode || "No barcode"} · {product.category || "No category"} · {product.unit || "pcs"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
    </div>
  );
}

function formatProductOption(product) {
  return `${product.name}${product.barcode ? ` - ${product.barcode}` : ""}`;
}

function getQuantityError({ type, quantityText, quantity, product, preview }) {
  if (!quantityText) return type === "set_exact" ? "Enter the target stock." : "Enter a quantity.";
  if (type !== "set_exact" && quantity <= 0) return "Quantity must be greater than zero.";
  if (type === "set_exact" && quantity < 0) return "Target stock cannot be negative.";
  if (product && preview.stockAfter < 0) return "Quantity is higher than current stock.";
  if (type === "set_exact" && product && quantity === product.stock) return "Target stock must change the current stock.";
  if (!preview.isValid) return "Enter a valid stock quantity.";
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

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
