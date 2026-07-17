import React from "react";
import { toast } from "sonner";
import { Badge, Button, Icon, Input, Panel } from "../components/primitives.jsx";
import { SettingsPageSkeleton } from "../components/page-loading.jsx";
import MasterDataManager from "../components/settings/MasterDataManager.jsx";
import { usePOSStore } from "../pos/store.jsx";

function normalizeTab(search) {
  const tab = new URLSearchParams(search || "").get("tab");
  if (tab === "categories" || tab === "units") return tab;
  return "profile";
}

const settingsTabs = [
  { id: "profile", label: "Profil toko", href: "?tab=profile" },
  { id: "categories", label: "Kategori", href: "?tab=categories" },
  { id: "units", label: "Satuan", href: "?tab=units" },
];

export default function SettingsPage({ search = "", onTabChange = () => {} }) {
  const store = usePOSStore();
  const tab = normalizeTab(search);
  const [draft, setDraft] = React.useState(store.settings);
  const [isPageLoading, setIsPageLoading] = React.useState(() => !store.loaded.settings);
  const [isSaving, setIsSaving] = React.useState(false);
  const isInitialLoad = tab === "profile" ? isPageLoading : !store.loaded[tab];
  const isUpdatingSettings = store.loading.settings && store.loaded.settings;
  const isUpdatingMasterData = tab !== "profile" && store.loading[tab];

  React.useEffect(() => {
    const controller = new AbortController();
    if (tab === "profile") {
      if (!store.loaded.settings) setIsPageLoading(true);
      store.loadSettings({ force: true, signal: controller.signal }).finally(() => {
        if (!controller.signal.aborted) setIsPageLoading(false);
      });
      return () => controller.abort();
    }
    if (tab === "categories") {
      store.loadCategories({ includeArchived: true, force: true, signal: controller.signal });
    }
    if (tab === "units") {
      store.loadUnits({ includeArchived: true, force: true, signal: controller.signal });
    }
    return () => controller.abort();
  }, [store, tab]);

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
        <h1 className="text-base font-semibold text-text">Pengaturan</h1>
        <div className="hidden lg:block" />
        {(isUpdatingSettings || isUpdatingMasterData) && <UpdatingBadge />}
      </header>

      <main className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <div className="inline-flex w-fit rounded-control border border-border bg-surface-muted p-1">
            {settingsTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                data-href={item.href}
                className={`rounded-control px-3 py-2 text-sm font-semibold transition ${tab === item.id ? "bg-surface text-text shadow-low" : "text-text-muted hover:bg-surface hover:text-text"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {tab === "profile" ? (
        <Panel className="p-4">
          <form onSubmit={save} className={`grid gap-4 ${isUpdatingSettings ? "opacity-60 transition-opacity duration-base ease-standard" : "transition-opacity duration-base ease-standard"}`}>
            <div className="border-b border-border pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">Profil toko</p>
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
          ) : null}
          {tab === "categories" ? (
            <MasterDataManager
              singularLabel="Kategori"
              pluralLabel="Kategori"
              items={store.categories}
              loading={store.loading.categories}
              onCreate={store.createCategory}
              onRename={store.renameCategory}
              onArchive={store.archiveCategory}
              onRestore={store.restoreCategory}
            />
          ) : null}
          {tab === "units" ? (
            <MasterDataManager
              singularLabel="Satuan"
              pluralLabel="Satuan"
              items={store.units}
              loading={store.loading.units}
              onCreate={store.createUnit}
              onRename={store.renameUnit}
              onArchive={store.archiveUnit}
              onRestore={store.restoreUnit}
            />
          ) : null}
        </div>

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
