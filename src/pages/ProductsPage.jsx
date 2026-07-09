import React from "react";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import { Badge, Button, DataTable, Dialog, Icon, Input } from "../components/primitives.jsx";
import { retailCategories } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";

function emptyProduct() {
  return { id: "", name: "", barcode: "", category: "Sembako", price: 0, stock: 0, unit: "pcs", active: true };
}

export default function ProductsPage() {
  const store = usePOSStore();
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState(null);
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
    store.saveProduct(editing);
    setEditing(null);
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
      render: (product) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(product)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => store.deactivateProduct(product.id)}>
            Deactivate
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-app-bg">
      <header className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-end lg:justify-between">
        <Input
          label="Search products"
          placeholder="Name, barcode, category"
          className="w-full max-w-xl"
          inputProps={{ value: query, onChange: (event) => setQuery(event.target.value) }}
        />
        <Button variant="primary" onClick={() => setEditing(emptyProduct())}>
          <Icon name="plus" className="size-4" />
          Add product
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid gap-4 rounded-panel border border-border bg-surface p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text">Product catalog</p>
            <p className="text-xs text-text-muted">Sortable retail product rows with stock and barcode visibility.</p>
          </div>
          <DataTable
            columns={columns}
            data={products}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            className="px-2 pb-2"
          />
        </div>
      </div>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit product" : "Add product"}
        size="lg"
        footer={
          <>
            <Button type="button" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" form="product-form">
              Save product
            </Button>
          </>
        }
      >
        {editing && (
          <form id="product-form" onSubmit={save} className="mt-4 grid gap-4 text-text">
            <Input
              label="Name"
              placeholder="Beras Ramos 5kg"
              inputProps={{
                value: editing.name,
                onChange: (event) => setEditing({ ...editing, name: event.target.value }),
                required: true,
              }}
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Input
                label="Barcode"
                placeholder="8991001000011"
                inputProps={{
                  value: editing.barcode,
                  onChange: (event) => setEditing({ ...editing, barcode: event.target.value }),
                  required: true,
                }}
              />
              <Button type="button" variant="secondary" onClick={() => setScannerOpen(true)}>
                <Icon name="barcode" className="size-4" />
                Scan
              </Button>
            </div>

            <label className="grid gap-2 text-sm font-semibold">
              Category
              <select
                className="h-[42px] rounded-control border border-border bg-surface px-3"
                value={editing.category}
                onChange={(event) => setEditing({ ...editing, category: event.target.value })}
              >
                {retailCategories
                  .filter((item) => item !== "Semua")
                  .map((item) => (
                    <option key={item}>{item}</option>
                  ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Price"
                placeholder="72000"
                inputProps={{
                  value: editing.price,
                  onChange: (event) => setEditing({ ...editing, price: event.target.value }),
                  inputMode: "numeric",
                  required: true,
                }}
              />
              <Input
                label="Stock"
                placeholder="18"
                inputProps={{
                  value: editing.stock,
                  onChange: (event) => setEditing({ ...editing, stock: event.target.value }),
                  inputMode: "numeric",
                  required: true,
                }}
              />
              <Input
                label="Unit"
                placeholder="pcs"
                inputProps={{
                  value: editing.unit,
                  onChange: (event) => setEditing({ ...editing, unit: event.target.value }),
                  required: true,
                }}
              />
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(event) => setEditing({ ...editing, active: event.target.checked })}
              />
              Active
            </label>
          </form>
        )}
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        title="Scan product barcode"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setEditing((current) => ({ ...current, barcode: code }));
          setScannerOpen(false);
        }}
      />
    </div>
  );
}
