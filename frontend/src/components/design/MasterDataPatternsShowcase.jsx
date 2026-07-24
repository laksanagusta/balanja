import React from "react";
import MasterDataManager from "../settings/MasterDataManager.jsx";
import MasterDataSelectField from "../product/MasterDataSelectField.jsx";
import SettingsNavigation from "../settings/SettingsNavigation.jsx";

const sampleItems = [
  { id: "cat-1", name: "Minuman", active: true },
  { id: "cat-2", name: "Snack", active: true },
  { id: "cat-3", name: "Lama", active: false },
];

const sampleSettingsTabs = [
  { id: "profile", label: "Profil toko", href: "?tab=profile" },
  { id: "categories", label: "Kategori", href: "?tab=categories" },
  { id: "units", label: "Satuan", href: "?tab=units" },
];

export default function MasterDataPatternsShowcase() {
  return (
    <section className="grid gap-4 rounded-panel border border-border bg-surface p-4 shadow-low">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">Master data pattern</p>
        <h3 className="mt-2 text-xl font-semibold text-text">Settings manager and finite selector stay aligned</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
          Settings memakai container query agar rail 14rem hanya muncul saat workspace benar-benar cukup lebar. Tab content memakai
          direction-aware transition yang mengikuti urutan navigasi, sementara reduced motion menggantinya dengan crossfade singkat.
          Pada ruang ringkas, nama panjang membungkus aman dan action mempertahankan target sentuh minimum 44px.
        </p>
      </div>
      <div className="settings-workspace overflow-hidden rounded-card border border-border bg-app-bg">
        <div className="settings-workspace-layout">
          <SettingsNavigation
            items={sampleSettingsTabs}
            activeId="categories"
            onChange={() => {}}
          />
          <div className="settings-content mx-auto w-full max-w-3xl">
            <MasterDataManager
              singularLabel="Kategori"
              pluralLabel="Kategori"
              items={sampleItems}
              onCreate={async (input) => ({ id: "cat-new", name: input.name.trim(), active: true })}
              onRename={async (id, input) => ({ id, name: input.name.trim(), active: true })}
              onArchive={async (id) => ({ id, name: "Minuman", active: false })}
              onRestore={async (id) => ({ id, name: "Lama", active: true })}
            />
          </div>
        </div>
      </div>
      <div className="max-w-3xl rounded-card border border-border bg-surface-muted/40 p-3">
        <MasterDataSelectField
          entityLabel="Kategori"
          value="cat-3"
          items={sampleItems}
          onChange={() => {}}
          onCreate={async (input) => ({ id: "cat-new", name: input.name.trim(), active: true })}
          onRestore={async (id) => ({ id, name: "Lama", active: true })}
        />
      </div>
    </section>
  );
}
