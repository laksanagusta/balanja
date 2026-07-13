import React from "react";
import { toast } from "sonner";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { Badge, Button, DataTable, Dialog, Icon, Input, SelectField, Switch } from "../components/primitives.jsx";
import { ProductsPageSkeleton } from "../components/page-loading.jsx";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { getNextSortState, sortRows } from "../lib/sorting.js";
import { parseNumberInput, retailCategories, validateProduct } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";
import { EmptyState } from "../components/design/EmptyStateShowcase.jsx";

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

const productSortConfig = {
  createdAt: { type: "date" },
  name: { type: "string" },
  category: { type: "string" },
  price: { type: "number" },
  stock: { type: "number" },
};

export default function ProductsPage() {
  const store = usePOSStore();
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState(null);
  const [productErrors, setProductErrors] = React.useState({});
  const [deactivating, setDeactivating] = React.useState(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [sortKey, setSortKey] = React.useState("createdAt");
  const [sortDir, setSortDir] = React.useState("desc");
  const [isPageLoading, setIsPageLoading] = React.useState(() => !store.loaded.products);
  const [savingProduct, setSavingProduct] = React.useState(false);
  const [deactivatingProduct, setDeactivatingProduct] = React.useState(false);
  const debouncedQuery = useDebouncedValue(query, 220);
  const isInitialLoad = isPageLoading;

  React.useEffect(() => {
    const controller = new AbortController();
    if (!store.loaded.products) setIsPageLoading(true);
    store.loadProducts({ force: true, signal: controller.signal }).finally(() => {
      if (!controller.signal.aborted) setIsPageLoading(false);
    });
    return () => controller.abort();
  }, [store.loadProducts]);

  if (isInitialLoad) {
    return <ProductsPageSkeleton />;
  }

  const isUpdatingProducts = store.loading.products && store.loaded.products;
  const isProductsMutating = savingProduct || deactivatingProduct;
  const filteredProducts = store.products.filter((product) =>
    `${product.name} ${product.barcode} ${product.category}`.toLowerCase().includes(debouncedQuery.toLowerCase()),
  );
  const products = sortRows(filteredProducts, sortKey, sortDir, productSortConfig);

  const handleSort = (key) => {
    const next = getNextSortState(sortKey, sortDir, key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  };

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
        toast.error("Failed to save product");
        return;
      }
      toast.success(editing.id ? "Product updated" : "Product added", {
        description: saved.name,
      });
      setEditing(null);
      setProductErrors({});
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
        toast.success("Product deactivated", {
          description: deactivating.name,
        });
        setDeactivating(null);
      } else {
        toast.error(result.error || "Failed to deactivate product");
      }
    } finally {
      setDeactivatingProduct(false);
    }
  };

  const columns = [
    { key: "name", label: "Product", sortable: true, render: (product) => <span className="font-semibold">{product.name}</span> },
    { key: "barcode", label: "Barcode", render: (product) => <span className="font-mono text-xs text-text-muted">{product.barcode}</span> },
    { key: "category", label: "Category", sortable: true },
    { key: "price", label: "Price", sortable: true, render: (product) => <span className="font-mono font-semibold tabular-nums">{formatPrice(product.price)}</span> },
    {
      key: "stock",
      label: "Stock",
      sortable: true,
      render: (product) => (
        <span className={`font-mono tabular-nums ${product.stock <= 5 ? "font-semibold text-warning" : "text-text"}`}>
          {formatNumberInput(product.stock)}
          <span className="text-text-subtle"> {product.unit}</span>
        </span>
      ),
    },
    { key: "active", label: "Status", render: (product) => <Badge tone={product.active ? "success" : "danger"}>{product.active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (product) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={isProductsMutating} onClick={() => setEditing(product)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" disabled={isProductsMutating} onClick={() => setDeactivating(product)}>
            Deactivate
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="grid gap-3 border-b border-border px-6 py-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <h1 className="text-base font-semibold text-text">Products</h1>
        <div className="flex w-full min-w-0 lg:ml-auto lg:w-[420px]">
          <div className="flex h-9 min-w-0 flex-1 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft">
            <Icon name="search" className="size-4 text-text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
              placeholder="Name, barcode, category"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <Button variant="secondary" className="whitespace-nowrap lg:justify-self-end" disabled={isProductsMutating} onClick={() => setEditing(emptyProduct())}>
          <Icon name="plus" className="size-4" />
          Add product
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid rounded-panel border border-border bg-surface p-0">
          <div className="border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">Product catalog</p>
                <p className="text-xs text-text-muted">Sortable retail product rows with stock and barcode visibility.</p>
              </div>
              {isUpdatingProducts && <UpdatingBadge />}
            </div>
          </div>
          {products.length ? (
            <DataTable
              columns={columns}
              data={products}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              paginated
              pageSize={8}
              className={`px-2 pb-2 ${isUpdatingProducts ? "opacity-60 transition-opacity duration-base ease-standard" : "transition-opacity duration-base ease-standard"}`}
            />
          ) : (
            <EmptyState
              icon="search"
              title="No products found"
              description="Try a different name, barcode, or category."
              action={<Button size="sm" variant="ghost" disabled={isProductsMutating} onClick={() => setQuery("")}>Clear search</Button>}
              className="m-4 min-h-[240px]"
            />
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(editing)}
        onClose={() => {
          if (savingProduct) return;
          setEditing(null);
          setProductErrors({});
        }}
        title={editing?.id ? "Edit product" : "Add product"}
        size="lg"
        footer={
          <>
            <Button type="button" disabled={savingProduct} onClick={() => { setEditing(null); setProductErrors({}); }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" form="product-form" disabled={savingProduct}>
              {savingProduct ? "Saving..." : "Save product"}
            </Button>
          </>
        }
      >
        {editing && (
          <form id="product-form" noValidate onSubmit={save} className="mt-4 grid gap-4 text-text">
            <Input
              label="Name"
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
                Scan
              </Button>
            </div>

            <SelectField
              label="Category"
              value={editing.category}
              options={retailCategories.filter((item) => item !== "Semua")}
              onChange={(category) => updateEditing("category", category)}
              disabled={savingProduct}
              error={productErrors.category}
            />

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Input
                label="Price"
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
                label="Stock"
                placeholder={editing.id ? "Managed by sales and stock adjustments" : "18"}
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
                  Stock is updated by checkout activity. Direct stock edits are intentionally disabled on existing products.
                </p>
              )}
              <Input
                label="Unit"
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
              <span>Active</span>
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
        title="Deactivate product?"
        footer={
          <>
            <Button type="button" disabled={deactivatingProduct} onClick={() => setDeactivating(null)}>Keep active</Button>
            <Button type="button" variant="danger" disabled={deactivatingProduct} onClick={deactivate}>
              {deactivatingProduct ? "Deactivating..." : "Deactivate"}
            </Button>
          </>
        }
      >
        <p className="mt-4">{deactivating?.name} will be removed from the active product catalog and current cart.</p>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        title="Scan product barcode"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setEditing((current) => ({ ...current, barcode: code }));
          toast.success("Barcode scanned", {
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
      Updating
    </span>
  );
}
