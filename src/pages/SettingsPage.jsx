import React from "react";
import { Button, Input } from "../components/primitives.jsx";
import { usePOSStore } from "../pos/store.jsx";

export default function SettingsPage() {
  const store = usePOSStore();
  const [settings, setSettings] = React.useState(store.settings);

  const save = (event) => {
    event.preventDefault();
    store.updateSettings({ ...settings, taxRate: Number(settings.taxRate) });
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <form onSubmit={save} className="grid max-w-2xl gap-5">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-text-muted">Store, tax, and manual QRIS details.</p>
        </div>

        <Input
          label="Store name"
          placeholder="Toko Balanja"
          inputProps={{
            value: settings.storeName,
            onChange: (event) => setSettings({ ...settings, storeName: event.target.value }),
          }}
        />
        <Input
          label="Store address"
          placeholder="Jl. UMKM No. 1"
          inputProps={{
            value: settings.storeAddress,
            onChange: (event) => setSettings({ ...settings, storeAddress: event.target.value }),
          }}
        />

        <label className="flex items-center gap-3 rounded-card border border-border bg-surface-muted p-4 text-sm font-semibold">
          <input
            type="checkbox"
            checked={settings.taxEnabled}
            onChange={(event) => setSettings({ ...settings, taxEnabled: event.target.checked })}
          />
          Enable tax
        </label>

        <Input
          label="Tax rate"
          placeholder="11"
          inputProps={{
            value: settings.taxRate,
            onChange: (event) => setSettings({ ...settings, taxRate: event.target.value }),
            inputMode: "decimal",
          }}
        />
        <Input
          label="QRIS label"
          placeholder="QRIS Toko Balanja"
          inputProps={{
            value: settings.qrisLabel,
            onChange: (event) => setSettings({ ...settings, qrisLabel: event.target.value }),
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary">
            Save settings
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => window.confirm("Reset demo data?") && store.resetDemoData()}
          >
            Reset demo data
          </Button>
        </div>
      </form>
    </div>
  );
}
