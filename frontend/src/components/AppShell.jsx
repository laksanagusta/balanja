import React from "react";
import { UserButton, useClerk, useUser } from "@clerk/react";
import { GradientAvatar } from "@outpacelabs/avatars";
import { toast } from "sonner";
import BarcodeScanner from "./BarcodeScanner.jsx";
import { navGroups, routes } from "../shared.jsx";
import { retailCategories, validateScannedProduct } from "../pos/domain.js";
import { usePOSStore } from "../pos/store.jsx";
import { Button, Dialog, Icon, Input, SelectField } from "./primitives.jsx";

function navIcon(icon) {
  if (icon === "box") return "package";
  return icon;
}

function productDraft(barcode) {
  return {
    id: "",
    name: "",
    barcode,
    category: "Sembako",
    price: 0,
    stock: 1,
    unit: "pcs",
    active: true,
  };
}

export default function AppShell({ children, pathname, onNavigate }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { notice, clearNotice, addScannedProductToCart, addToCart, products, loadProducts } = usePOSStore();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [missingBarcode, setMissingBarcode] = React.useState("");
  const [newProduct, setNewProduct] = React.useState(null);
  const [scannedProductErrors, setScannedProductErrors] = React.useState({});
  const [accountOpen, setAccountOpen] = React.useState(false);
  const avatarSeed = user?.primaryEmailAddress?.emailAddress || user?.fullName || user?.id || "cashier";

  const go = (path) => {
    onNavigate(path);
    setMobileNavOpen(false);
  };

  const saveScannedProduct = (event) => {
    event.preventDefault();
    const validation = validateScannedProduct(newProduct, products);
    setScannedProductErrors(validation.errors);
    if (!validation.ok) return;

    addScannedProductToCart(newProduct);

    toast.success("Product added to cart", { description: newProduct.name });
    setNewProduct(null);
    setScannedProductErrors({});
    setScannerOpen(true);
  };

  const updateScannedProduct = (field, value) => {
    const updated = { ...newProduct, [field]: value };
    setNewProduct(updated);
    if (scannedProductErrors[field]) {
      setScannedProductErrors((current) => ({
        ...current,
        [field]: validateScannedProduct(updated, products).errors[field],
      }));
    }
  };

  React.useEffect(() => {
    if (!notice) return;
    if (notice === "Transaction completed" || notice === "Settings saved") {
      toast.success(notice);
    } else {
      toast.error(notice);
    }
    clearNotice();
  }, [notice, clearNotice]);

  React.useEffect(() => {
    if (!scannerOpen) return;
    const controller = new AbortController();
    loadProducts({ signal: controller.signal });
    return () => controller.abort();
  }, [loadProducts, scannerOpen]);

  return (
    <div className="h-svh overflow-hidden bg-app-bg p-2">
      <div className="flex h-full gap-2 overflow-hidden">
        <aside className="hidden h-full w-[236px] shrink-0 flex-col rounded-card border border-border bg-surface md:flex">
          <div className="flex h-14 items-center justify-between px-4">
            <button type="button" onClick={() => go(routes.pos)} className="text-left text-sm font-semibold lowercase text-text">
              balanja
            </button>
          </div>

          <div className="p-2">
            <Button variant="primary" size="md" className="w-full" onClick={() => setScannerOpen(true)}>
              <Icon name="scan" className="size-4" />
              Scan barcode
            </Button>
          </div>

          <nav className="grid gap-1.5 p-2">
            {navGroups.flatMap((group) =>
              group.items.map(([label, icon, path]) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => go(path)}
                  className={`flex h-8 items-center gap-2.5 rounded-control px-3 text-sm font-semibold transition ${
                    pathname === path
                      ? "bg-surface-muted text-text"
                      : "text-text-muted hover:bg-surface-muted hover:text-text"
                  }`}
                >
                  <Icon name={navIcon(icon)} className="size-4" />
                  {label}
                </button>
              )),
            )}
          </nav>

          <div className="relative mt-auto p-3">
            {accountOpen && (
              <div className="absolute bottom-[72px] left-3 right-3 z-30 rounded-card border border-border bg-surface p-2 shadow-panel">
                <div className="border-b border-border px-3 py-2">
                  <p className="truncate text-sm font-semibold text-text">{user?.fullName || "Cashier"}</p>
                  <p className="truncate text-xs text-text-muted">
                    {user?.primaryEmailAddress?.emailAddress || "Signed in"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ redirectUrl: "/" })}
                  className="mt-1 flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-semibold text-danger transition hover:bg-danger-soft"
                >
                  <Icon name="x" className="size-4" />
                  Logout
                </button>
              </div>
            )}
            <button
              type="button"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
              className="flex w-full items-center gap-3 rounded-control border border-border bg-surface-muted p-2 text-left transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span className="size-9 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                <GradientAvatar seed={avatarSeed} size={36} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text">{user?.fullName || "Cashier"}</span>
                <span className="block truncate text-xs text-text-muted">
                  {user?.primaryEmailAddress?.emailAddress || "Signed in"}
                </span>
              </span>
              <Icon name="chevron" className={`size-4 text-text-muted transition ${accountOpen ? "" : "rotate-180"}`} />
            </button>
            {accountOpen && (
              <button
                type="button"
                aria-label="Close account menu"
                className="fixed inset-0 z-20 cursor-default bg-transparent"
                onClick={() => setAccountOpen(false)}
              />
            )}
            </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="grid size-10 place-items-center rounded-control border border-border"
            >
              <Icon name="menu" className="size-5" />
            </button>
            <button type="button" onClick={() => go(routes.pos)} className="text-base font-bold">
              Balanja
            </button>
            <UserButton afterSignOutUrl="/" />
          </header>

          {mobileNavOpen && (
            <div className="grid gap-2 border-b border-border p-2 md:hidden">
              <Button variant="primary" size="md" className="justify-start" onClick={() => setScannerOpen(true)}>
                <Icon name="scan" className="size-4" />
                Scan barcode
              </Button>
              {navGroups.flatMap((group) =>
                group.items.map(([label, icon, path]) => (
                  <Button
                    key={path}
                    variant={pathname === path ? "primary" : "secondary"}
                    className="justify-start"
                    onClick={() => go(path)}
                  >
                    <Icon name={navIcon(icon)} className="size-4" />
                    {label}
                  </Button>
                )),
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </section>
      </div>
      <BarcodeScanner
        open={scannerOpen}
        title="Scan product barcode"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          const result = addToCart(code);
          setScannerOpen(false);
          if (result?.ok) {
            toast.success("Product added from barcode", {
              description: code,
            });
            return;
          }
          if (result?.error === "Product not found") {
            clearNotice();
            setMissingBarcode(code);
          }
        }}
      />
      <Dialog
        open={Boolean(missingBarcode)}
        onClose={() => setMissingBarcode("")}
        title="Barcode not found"
        footer={
          <>
            <Button type="button" onClick={() => setMissingBarcode("")}>Cancel</Button>
            <Button
              type="button"
              onClick={() => {
                setMissingBarcode("");
                setScannerOpen(true);
              }}
            >
              Scan again
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setNewProduct(productDraft(missingBarcode));
                setScannedProductErrors({});
                setMissingBarcode("");
              }}
            >
              Add product
            </Button>
          </>
        }
      >
        <p className="mt-4">
          Barcode <span className="font-mono font-semibold text-text">{missingBarcode}</span> is not in the product catalog.
        </p>
      </Dialog>
      <Dialog
        open={Boolean(newProduct)}
        onClose={() => {
          setNewProduct(null);
          setScannedProductErrors({});
        }}
        title="Add product"
        size="lg"
        footer={
          <>
            <Button type="button" onClick={() => { setNewProduct(null); setScannedProductErrors({}); }}>Cancel</Button>
            <Button type="submit" variant="primary" form="scanned-product-form">Save and add to cart</Button>
          </>
        }
      >
        {newProduct && (
          <form id="scanned-product-form" noValidate onSubmit={saveScannedProduct} className="mt-4 grid gap-4 text-text">
            <Input
              label="Name"
              placeholder="Beras Ramos 5kg"
              error={scannedProductErrors.name}
              inputProps={{
                value: newProduct.name,
                onChange: (event) => updateScannedProduct("name", event.target.value),
                required: true,
              }}
            />
            <Input
              label="Barcode"
              error={scannedProductErrors.barcode}
              inputProps={{
                value: newProduct.barcode,
                onChange: (event) => updateScannedProduct("barcode", event.target.value),
                required: true,
              }}
            />
            <SelectField
              label="Category"
              value={newProduct.category}
              options={retailCategories.filter((item) => item !== "Semua")}
              onChange={(category) => updateScannedProduct("category", category)}
              error={scannedProductErrors.category}
            />
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Input
                label="Price"
                error={scannedProductErrors.price}
                inputProps={{
                  value: newProduct.price,
                  onChange: (event) => updateScannedProduct("price", event.target.value),
                  inputMode: "numeric",
                  required: true,
                }}
              />
              <Input
                label="Stock"
                error={scannedProductErrors.stock}
                inputProps={{
                  value: newProduct.stock,
                  onChange: (event) => updateScannedProduct("stock", event.target.value),
                  inputMode: "numeric",
                  required: true,
                }}
              />
              <Input
                label="Unit"
                className="sm:col-span-2"
                error={scannedProductErrors.unit}
                inputProps={{
                  value: newProduct.unit,
                  onChange: (event) => updateScannedProduct("unit", event.target.value),
                  required: true,
                }}
              />
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
