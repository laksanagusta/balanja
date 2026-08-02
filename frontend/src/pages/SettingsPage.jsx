import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button, Icon, Input, Panel, Switch } from "../components/primitives.jsx";
import BackgroundUpdateStatus from "../components/feedback/BackgroundUpdateStatus.jsx";
import { SettingsPageSkeleton } from "../components/page-loading.jsx";
import MasterDataManager from "../components/settings/MasterDataManager.jsx";
import SettingsNavigation from "../components/settings/SettingsNavigation.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { getSettingsTabDirection } from "./settings-motion.js";
import { useScanSoundPreference } from "../hooks/useScanSoundPreference.js";

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
  const { loadCategories, loadSettings, loadUnits } = store;
  const tab = normalizeTab(search);
  const shouldReduceMotion = useReducedMotion();
  const previousTabRef = React.useRef(tab);
  const hasRenderedTabRef = React.useRef(false);
  const direction = getSettingsTabDirection(previousTabRef.current, tab);
  const shouldAnimate = hasRenderedTabRef.current && direction !== 0;
  const [draft, setDraft] = React.useState(store.settings);
  const [isPageLoading, setIsPageLoading] = React.useState(() => !store.loaded.settings);
  const [isSaving, setIsSaving] = React.useState(false);
  const [scanSoundEnabled, setScanSoundEnabled] = useScanSoundPreference();
  const isInitialLoad = tab === "profile" ? isPageLoading : !store.loaded[tab];
  const isUpdatingSettings = store.loading.settings && store.loaded.settings;
  const isUpdatingMasterData = tab !== "profile" && store.loading[tab];

  React.useEffect(() => {
    const controller = new AbortController();
    if (tab === "profile") {
      if (!store.loaded.settings) setIsPageLoading(true);
      loadSettings({ force: true, signal: controller.signal }).finally(() => {
        if (!controller.signal.aborted) setIsPageLoading(false);
      });
      return () => controller.abort();
    }
    if (tab === "categories") {
      loadCategories({ includeArchived: true, force: true, signal: controller.signal });
    }
    if (tab === "units") {
      loadUnits({ includeArchived: true, force: true, signal: controller.signal });
    }
    return () => controller.abort();
  }, [loadCategories, loadSettings, loadUnits, tab]);

  React.useEffect(() => {
    setDraft(store.settings);
  }, [store.settings]);

  React.useEffect(() => {
    if (isInitialLoad) return;
    previousTabRef.current = tab;
    hasRenderedTabRef.current = true;
  }, [isInitialLoad, tab]);

  const save = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await store.updateSettings({
        ...draft,
        taxRate: Number(draft.taxRate) || 0,
        taxEnabled: Boolean(draft.taxEnabled),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isInitialLoad) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <BackgroundUpdateStatus active={isUpdatingSettings || isUpdatingMasterData} label="Memperbarui pengaturan" />

      <main className="settings-workspace min-h-0 flex-1 overflow-auto">
        <div className="settings-workspace-layout">
          <SettingsNavigation items={settingsTabs} activeId={tab} onChange={onTabChange} />

          <div className="settings-content mx-auto grid w-full max-w-3xl gap-4">
            <motion.div
              key={tab}
              className="min-w-0"
              initial={shouldAnimate
                ? { opacity: 0.7, x: shouldReduceMotion ? 0 : direction * 20 }
                : false}
              animate={{ opacity: 1, x: 0 }}
              transition={shouldReduceMotion
                ? { duration: 0.14, ease: "easeOut" }
                : { type: "spring", bounce: 0, duration: 0.28 }}
            >
              {tab === "profile" ? (
                <Panel className="p-4">
                  <form onSubmit={save} className="grid gap-2">
                    <div className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text">Profil toko</p>
                          <p className="text-xs text-text-muted">Digunakan di layar kasir dan konteks transaksi.</p>
                        </div>
                      </div>
                    </div>

                    <Input
                      label="Nama toko"
                      placeholder="Toko Balanja"
                      inputProps={{
                        value: draft.storeName,
                        onChange: (event) => setDraft({ ...draft, storeName: event.target.value }),
                        required: true,
                        disabled: isSaving,
                      }}
                    />
                    <Input
                      label="Alamat toko"
                      placeholder="Jl. UMKM No. 1"
                      inputProps={{
                        value: draft.storeAddress,
                        onChange: (event) => setDraft({ ...draft, storeAddress: event.target.value }),
                        disabled: isSaving,
                      }}
                    />
                    <Input
                      label="Label QRIS"
                      placeholder="QRIS Toko Balanja"
                      inputProps={{
                        value: draft.qrisLabel,
                        onChange: (event) => setDraft({ ...draft, qrisLabel: event.target.value }),
                        disabled: isSaving,
                      }}
                    />

                    <div className="grid gap-2 rounded-card border border-border bg-surface-muted p-4">
                      <label className="flex min-h-11 min-w-0 items-center justify-between gap-4 text-sm font-semibold text-text">
                        Aktifkan pajak
                        <input
                          type="checkbox"
                          checked={draft.taxEnabled}
                          onChange={(event) => setDraft({ ...draft, taxEnabled: event.target.checked })}
                          disabled={isSaving}
                        />
                      </label>
                      <Input
                        label="Tarif pajak"
                        placeholder="11"
                        inputProps={{
                          value: draft.taxRate,
                          onChange: (event) => setDraft({ ...draft, taxRate: event.target.value }),
                          inputMode: "numeric",
                          disabled: isSaving,
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={scanSoundEnabled}
                      onClick={() => setScanSoundEnabled(!scanSoundEnabled)}
                      className="flex min-h-11 w-full items-center justify-between gap-4 rounded-button border border-border bg-surface px-4 py-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-text">Bunyi pemindaian</span>
                        <span className="mt-0.5 block text-xs leading-5 text-text-muted">Putar bunyi halus setelah barcode berhasil diproses pada perangkat ini.</span>
                      </span>
                      <Switch checked={scanSoundEnabled} decorative />
                    </button>

                    <div className="settings-form-actions">
                      <Button type="submit" variant="primary" disabled={isSaving}>
                        <Icon name="check" className="size-4" />
                        {isSaving ? "Menyimpan..." : "Simpan pengaturan"}
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
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
