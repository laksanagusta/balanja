import React from "react";
import { toast } from "sonner";
import { Badge, Button, Icon, Input, Panel } from "../components/primitives.jsx";
import { SettingsPageSkeleton } from "../components/page-loading.jsx";
import { usePOSStore } from "../pos/store.jsx";

export default function SettingsPage() {
  const store = usePOSStore();
  const [draft, setDraft] = React.useState(store.settings);
  const [isPageLoading, setIsPageLoading] = React.useState(() => !store.loaded.settings);
  const [isSaving, setIsSaving] = React.useState(false);
  const isInitialLoad = isPageLoading;
  const isUpdatingSettings = store.loading.settings && store.loaded.settings;

  React.useEffect(() => {
    const controller = new AbortController();
    if (!store.loaded.settings) setIsPageLoading(true);
    store.loadSettings({ force: true, signal: controller.signal }).finally(() => {
      if (!controller.signal.aborted) setIsPageLoading(false);
    });
    return () => controller.abort();
  }, [store.loadSettings]);

  React.useEffect(() => {
    setDraft(store.settings);
  }, [store.settings]);

  const save = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await store.updateSettings({
        ...draft,
        taxRate: Number(draft.taxRate) || 0,
        taxEnabled: Boolean(draft.taxEnabled),
      });
      if (saved) toast.success("Settings saved");
      else toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isInitialLoad) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="grid gap-3 border-b border-border px-6 py-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <h1 className="text-base font-semibold text-text">Settings</h1>
        <div className="hidden lg:block" />
        {isUpdatingSettings && <UpdatingBadge />}
      </header>

      <main className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-4">
          <form onSubmit={save} className={`grid gap-4 ${isUpdatingSettings ? "opacity-60 transition-opacity duration-base ease-standard" : "transition-opacity duration-base ease-standard"}`}>
            <div className="border-b border-border pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">Store profile</p>
                  <p className="text-xs text-text-muted">Used on cashier screens and transaction context.</p>
                </div>
                {isUpdatingSettings && <UpdatingBadge />}
              </div>
            </div>

            <Input
              label="Store name"
              placeholder="Toko Balanja"
              inputProps={{
                value: draft.storeName,
                onChange: (event) => setDraft({ ...draft, storeName: event.target.value }),
                required: true,
                disabled: isSaving,
              }}
            />
            <Input
              label="Store address"
              placeholder="Jl. UMKM No. 1"
              inputProps={{
                value: draft.storeAddress,
                onChange: (event) => setDraft({ ...draft, storeAddress: event.target.value }),
                disabled: isSaving,
              }}
            />
            <Input
              label="QRIS label"
              placeholder="QRIS Toko Balanja"
              inputProps={{
                value: draft.qrisLabel,
                onChange: (event) => setDraft({ ...draft, qrisLabel: event.target.value }),
                disabled: isSaving,
              }}
            />

            <div className="grid gap-3 rounded-card border border-border bg-surface-muted p-4">
              <label className="flex items-center justify-between gap-4 text-sm font-semibold text-text">
                Enable tax
                <input
                  type="checkbox"
                  checked={draft.taxEnabled}
                  onChange={(event) => setDraft({ ...draft, taxEnabled: event.target.checked })}
                  disabled={isSaving}
                />
              </label>
              <Input
                label="Tax rate"
                placeholder="11"
                inputProps={{
                  value: draft.taxRate,
                  onChange: (event) => setDraft({ ...draft, taxRate: event.target.value }),
                  inputMode: "numeric",
                  disabled: isSaving,
                }}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={isSaving}>
                <Icon name="check" className="size-4" />
                {isSaving ? "Saving..." : "Save settings"}
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

        </aside>
      </main>
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
