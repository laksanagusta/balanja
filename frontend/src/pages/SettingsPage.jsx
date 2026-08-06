import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button, Input, Panel, Switch } from "../components/primitives.jsx";
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

const settingsLoadMessages = {
  profile: "Pengaturan toko belum berhasil dimuat. Coba lagi.",
  categories: "Kategori belum berhasil dimuat. Coba lagi.",
  units: "Satuan belum berhasil dimuat. Coba lagi.",
};

function SettingsLoadError({ tab, onRetry }) {
  return (
    <Panel role="alert" className="grid gap-3 border-danger/30 bg-danger-soft/35 p-4 !shadow-none">
      <div className="grid gap-1">
        <h2 className="text-sm font-semibold text-text">Pengaturan belum tersedia</h2>
        <p className="text-sm leading-5 text-danger">{settingsLoadMessages[tab]}</p>
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
        Coba lagi
      </Button>
    </Panel>
  );
}

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
  const [loadError, setLoadError] = React.useState("");
  const [retryKey, setRetryKey] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const [scanSoundEnabled, setScanSoundEnabled] = useScanSoundPreference();
  const isInitialLoad = tab === "profile"
    ? isPageLoading || !store.loaded.settings
    : !store.loaded[tab];
  const isUpdatingSettings = store.loading.settings && store.loaded.settings;
  const isUpdatingMasterData = tab !== "profile" && store.loading[tab];

  React.useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    if (tab === "profile") {
      if (!store.loaded.settings) setIsPageLoading(true);
      loadSettings({ force: true, signal: controller.signal, silent: true }).then((result) => {
        if (!controller.signal.aborted && !result) setLoadError(settingsLoadMessages.profile);
      }).finally(() => {
        if (!controller.signal.aborted) setIsPageLoading(false);
      });
      return () => controller.abort();
    }
    if (tab === "categories") {
      loadCategories({ includeArchived: true, force: true, signal: controller.signal, silent: true }).then((result) => {
        if (!controller.signal.aborted && !result) setLoadError(settingsLoadMessages.categories);
      });
    }
    if (tab === "units") {
      loadUnits({ includeArchived: true, force: true, signal: controller.signal, silent: true }).then((result) => {
        if (!controller.signal.aborted && !result) setLoadError(settingsLoadMessages.units);
      });
    }
    return () => controller.abort();
  }, [loadCategories, loadSettings, loadUnits, retryKey, tab]);

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
    setSaveError("");
    try {
      const saved = await store.updateSettings({
        ...draft,
        taxRate: Number(draft.taxRate) || 0,
        taxEnabled: Boolean(draft.taxEnabled),
      });
      if (!saved) setSaveError("Pengaturan belum berhasil disimpan. Coba lagi.");
    } catch {
      setSaveError("Pengaturan belum berhasil disimpan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const retryLoad = () => {
    setLoadError("");
    if (tab === "profile" && !store.loaded.settings) setIsPageLoading(true);
    setRetryKey((current) => current + 1);
  };

  if (isInitialLoad && !loadError) {
    return <SettingsPageSkeleton tab={tab} />;
  }

  return (
    <div className="min-h-full bg-surface">
      <BackgroundUpdateStatus active={isUpdatingSettings || isUpdatingMasterData} label="Memperbarui pengaturan" />

      <main className="settings-workspace">
        <div className="settings-workspace-layout">
          <SettingsNavigation items={settingsTabs} activeId={tab} onChange={onTabChange} />

          <div className="settings-content mx-auto grid w-full max-w-3xl gap-4">
            {isInitialLoad && loadError ? <SettingsLoadError tab={tab} onRetry={retryLoad} /> : null}
            {!isInitialLoad && loadError ? (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-danger/30 bg-danger-soft/35 px-3 py-2 text-sm">
                <span className="font-medium text-danger">{loadError}</span>
                <Button type="button" size="sm" variant="secondary" onClick={retryLoad}>Coba lagi</Button>
              </div>
            ) : null}
            {!isInitialLoad ? <motion.div
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
                <Panel className="mx-1 p-4 !border-0 !smooth-shadow-ring-xs !shadow-black !smooth-ring-neutral-300/30">
                  <form onSubmit={save} className="settings-profile-form grid gap-4">
                    <div className="grid gap-2">
                      <div className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-sm font-semibold text-text">Profil toko</h2>
                            <p className="text-xs text-text-muted">Digunakan di layar kasir dan konteks transaksi.</p>
                          </div>
                        </div>
                      </div>

                      <Input
                        label="Nama toko"
                        placeholder="Toko Wipay"
                        inputProps={{
                          name: "storeName",
                          autoComplete: "organization",
                          value: draft.storeName,
                          onChange: (event) => {
                            setSaveError("");
                            setDraft({ ...draft, storeName: event.target.value });
                          },
                          required: true,
                          disabled: isSaving,
                        }}
                      />
                      <Input
                        label="Alamat toko"
                        placeholder="Jl. UMKM No. 1"
                        inputProps={{
                          name: "storeAddress",
                          autoComplete: "street-address",
                          value: draft.storeAddress,
                          onChange: (event) => {
                            setSaveError("");
                            setDraft({ ...draft, storeAddress: event.target.value });
                          },
                          disabled: isSaving,
                        }}
                      />
                      <Input
                        label="Label QRIS"
                        placeholder="QRIS Toko Wipay"
                        inputProps={{
                          name: "qrisLabel",
                          autoComplete: "off",
                          value: draft.qrisLabel,
                          onChange: (event) => {
                            setSaveError("");
                            setDraft({ ...draft, qrisLabel: event.target.value });
                          },
                          disabled: isSaving,
                        }}
                      />
                    </div>

                    <div className="grid gap-2 rounded-card border border-border bg-surface-muted p-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(draft.taxEnabled)}
                        disabled={isSaving}
                        onClick={() => {
                          setSaveError("");
                          setDraft({ ...draft, taxEnabled: !draft.taxEnabled });
                        }}
                        className="flex min-h-11 min-w-0 items-center justify-between gap-4 rounded-button text-left text-sm font-semibold text-text transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
                      >
                        <span className="min-w-0">Aktifkan pajak</span>
                        <span className="shrink-0">
                          <Switch checked={Boolean(draft.taxEnabled)} tone="success" decorative />
                        </span>
                      </button>
                      <Input
                        label="Tarif pajak"
                        placeholder="11"
                        inputProps={{
                          name: "taxRate",
                          type: "number",
                          min: 0,
                          max: 100,
                          step: "0.01",
                          value: draft.taxRate,
                          onChange: (event) => {
                            setSaveError("");
                            setDraft({ ...draft, taxRate: event.target.value });
                          },
                          inputMode: "decimal",
                          disabled: !draft.taxEnabled || isSaving,
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
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-text">Bunyi pemindaian</span>
                        <span className="mt-0.5 block text-xs leading-5 text-text-muted">Putar bunyi halus setelah barcode berhasil diproses pada perangkat ini.</span>
                      </span>
                      <span className="shrink-0">
                        <Switch checked={scanSoundEnabled} tone="success" decorative />
                      </span>
                    </button>

                    <div className="form-actions">
                      <Button type="submit" variant="primary" disabled={isSaving}>
                        {isSaving ? "Menyimpan..." : "Simpan pengaturan"}
                      </Button>
                    </div>
                    {saveError ? <p role="alert" className="text-sm font-medium text-danger">{saveError}</p> : null}
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
            </motion.div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
