import React from "react";
import { toast } from "sonner";
import { Badge, Button, Icon, Input, Panel } from "../components/primitives.jsx";
import { usePOSStore } from "../pos/store.jsx";

export default function SettingsPage() {
  const store = usePOSStore();
  const [draft, setDraft] = React.useState(store.settings);

  React.useEffect(() => {
    setDraft(store.settings);
  }, [store.settings]);

  const save = (event) => {
    event.preventDefault();
    store.updateSettings({
      ...draft,
      taxRate: Number(draft.taxRate) || 0,
      taxEnabled: Boolean(draft.taxEnabled),
    });
  };

  const resetDemoData = () => {
    store.resetDemoData();
    toast.success("Demo data reset");
  };

  return (
    <div className="min-h-full overflow-auto bg-app-bg">
      <header className="border-b border-border p-4">
        <h1 className="text-2xl font-semibold text-text">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Store profile, tax, QRIS label, and local demo data.</p>
      </header>

      <main className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-4">
          <form onSubmit={save} className="grid gap-4">
            <div className="border-b border-border pb-3">
              <p className="text-sm font-semibold text-text">Store profile</p>
              <p className="text-xs text-text-muted">Used on cashier screens and transaction context.</p>
            </div>

            <Input
              label="Store name"
              placeholder="Toko Balanja"
              inputProps={{
                value: draft.storeName,
                onChange: (event) => setDraft({ ...draft, storeName: event.target.value }),
                required: true,
              }}
            />
            <Input
              label="Store address"
              placeholder="Jl. UMKM No. 1"
              inputProps={{
                value: draft.storeAddress,
                onChange: (event) => setDraft({ ...draft, storeAddress: event.target.value }),
              }}
            />
            <Input
              label="QRIS label"
              placeholder="QRIS Toko Balanja"
              inputProps={{
                value: draft.qrisLabel,
                onChange: (event) => setDraft({ ...draft, qrisLabel: event.target.value }),
              }}
            />

            <div className="grid gap-3 rounded-card border border-border bg-surface-muted p-4">
              <label className="flex items-center justify-between gap-4 text-sm font-semibold text-text">
                Enable tax
                <input
                  type="checkbox"
                  checked={draft.taxEnabled}
                  onChange={(event) => setDraft({ ...draft, taxEnabled: event.target.checked })}
                />
              </label>
              <Input
                label="Tax rate"
                placeholder="11"
                inputProps={{
                  value: draft.taxRate,
                  onChange: (event) => setDraft({ ...draft, taxRate: event.target.value }),
                  inputMode: "numeric",
                }}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                <Icon name="check" className="size-4" />
                Save settings
              </Button>
            </div>
          </form>
        </Panel>

        <aside className="grid content-start gap-4">
          <Panel className="grid gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text">Current store</p>
              <Badge tone="accent">Local MVP</Badge>
            </div>
            <div className="grid gap-2 text-sm">
              <div>
                <p className="text-text-muted">Name</p>
                <p className="font-semibold text-text">{store.settings.storeName}</p>
              </div>
              <div>
                <p className="text-text-muted">Address</p>
                <p className="font-semibold text-text">{store.settings.storeAddress || "-"}</p>
              </div>
              <div>
                <p className="text-text-muted">Tax</p>
                <p className="font-semibold text-text">
                  {store.settings.taxEnabled ? `${store.settings.taxRate}% enabled` : "Disabled"}
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="grid gap-3 p-4">
            <p className="text-sm font-semibold text-text">Demo data</p>
            <p className="text-sm leading-6 text-text-muted">
              Reset products, cart, transactions, and settings to the default retail UMKM sample.
            </p>
            <Button variant="danger" onClick={resetDemoData}>
              Reset demo data
            </Button>
          </Panel>
        </aside>
      </main>
    </div>
  );
}
