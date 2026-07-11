import React from "react";
import { toast } from "sonner";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { Badge, Button, DataTable, Dialog, Icon, Input, SelectField } from "../components/primitives.jsx";
import { retailCategories, validateProduct } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";
import { EmptyState } from "../components/design/EmptyStateShowcase.jsx";

function emptyProduct() {
  return { id: "", name: "", barcode: "", category: "Sembako", price: "", stock: 0, unit: "pcs", active: true };
}

export default function ProductsPage() {
  const store = usePOSStore();
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState(null);
  const [productErrors, setProductErrors] = React.useState({});
  const [deactivating, setDeactivating] = React.useState(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [sortKey, setSortKey] = React.useState("name");
  const [sortDir, setSortDir] = React.useState("asc");

  const products = store.products
    .filter((product) => `${product.name} ${product.barcode} ${product.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (a[sortKey] < b[sortKey]) return -1 * dir;
      if (a[sortKey] > b[sortKey]) return 1 * dir;
      return 0;
    });

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const save = (event) => {
    event.preventDefault();
    const validation = validateProduct(editing, store.products);
    setProductErrors(validation.errors);
    if (!validation.ok) return;

    store.saveProduct(editing);
    toast.success(editing.id ? "Product updated" : "Product added", {
      description: editing.name,
    });
    setEditing(null);
    setProductErrors({});
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

  const deactivate = () => {
    store.deactivateProduct(deactivating.id);
    toast.success("Product deactivated", {
      description: deactivating.name,
    });
    setDeactivating(null);
  };

  const columns = [
    { key: "name", label: "Product", sortable: true, render: (product) => <span className="font-semibold">{product.name}</span> },
    { key: "barcode", label: "Barcode", sortable: true, render: (product) => <span className="font-mono text-xs text-text-muted">{product.barcode}</span> },
    { key: "category", label: "Category", sortable: true },
    { key: "price", label: "Price", sortable: true, render: (product) => <span className="font-mono font-semibold tabular-nums">{formatPrice(product.price)}</span> },
    {
      key: "stock",
      label: "Stock",
      sortable: true,
      render: (product) => (
        <span className={`font-mono tabular-nums ${product.stock <= 5 ? "font-semibold text-warning" : "text-text"}`}>
          {product.stock}
          <span className="text-text-subtle"> {product.unit}</span>
        </span>
      ),
    },
    { key: "active", label: "Status", sortable: true, render: (product) => <Badge tone={product.active ? "success" : "danger"}>{product.active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (product) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(product)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeactivating(product)}>
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
        <Button variant="primary" className="whitespace-nowrap lg:justify-self-end" onClick={() => setEditing(emptyProduct())}>
          <Icon name="plus" className="size-4" />
          Add product
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid rounded-panel border border-border bg-surface p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text">Product catalog</p>
            <p className="text-xs text-text-muted">Sortable retail product rows with stock and barcode visibility.</p>
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
              className="px-2 pb-2"
            />
          ) : (
            <EmptyState
              icon="search"
              title="No products found"
              description="Try a different name, barcode, or category."
              action={<Button size="sm" variant="ghost" onClick={() => setQuery("")}>Clear search</Button>}
              className="m-4 min-h-[240px]"
            />
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(editing)}
        onClose={() => {
          setEditing(null);
          setProductErrors({});
        }}
        title={editing?.id ? "Edit product" : "Add product"}
        size="lg"
        footer={
          <>
            <Button type="button" onClick={() => { setEditing(null); setProductErrors({}); }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" form="product-form">
              Save product
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
                }}
              />
              <Button type="button" variant="secondary" onClick={() => setScannerOpen(true)}>
                <Icon name="barcode" className="size-4" />
                Scan
              </Button>
            </div>

            <SelectField
              label="Category"
              value={editing.category}
              options={retailCategories.filter((item) => item !== "Semua")}
              onChange={(category) => updateEditing("category", category)}
              error={productErrors.category}
            />

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Input
                label="Price"
                placeholder="72000"
                error={productErrors.price}
                inputProps={{
                  value: editing.price,
                  onChange: (event) => updateEditing("price", event.target.value),
                  inputMode: "numeric",
                  required: true,
                }}
              />
              <Input
                label="Stock"
                placeholder="18"
                error={productErrors.stock}
                inputProps={{
                  value: editing.stock,
                  onChange: (event) => updateEditing("stock", event.target.value),
                  inputMode: "numeric",
                  required: true,
                }}
              />
              <Input
                label="Unit"
                className="sm:col-span-2"
                placeholder="pcs"
                error={productErrors.unit}
                inputProps={{
                  value: editing.unit,
                  onChange: (event) => updateEditing("unit", event.target.value),
                  required: true,
                }}
              />
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(event) => updateEditing("active", event.target.checked)}
              />
              Active
            </label>
          </form>
        )}
      </Dialog>

      <Dialog
        open={Boolean(deactivating)}
        onClose={() => setDeactivating(null)}
        title="Deactivate product?"
        footer={
          <>
            <Button type="button" onClick={() => setDeactivating(null)}>Keep active</Button>
            <Button type="button" variant="danger" onClick={deactivate}>Deactivate</Button>
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
