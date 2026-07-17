import React from "react";
import MasterDataManager from "../settings/MasterDataManager.jsx";
import MasterDataSelectField from "../product/MasterDataSelectField.jsx";

const sampleItems = [
  { id: "cat-1", name: "Minuman", active: true },
  { id: "cat-2", name: "Snack", active: true },
  { id: "cat-3", name: "Lama", active: false },
];

export default function MasterDataPatternsShowcase() {
  return (
    <section className="grid gap-4 rounded-panel border border-border bg-surface p-4 shadow-low">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">Master data pattern</p>
        <h3 className="mt-2 text-xl font-semibold text-text">Settings manager and finite selector stay aligned</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
          Settings memakai tab query-backed yang netral, list aktif tetap terlihat saat mutation, arsip reversible, selector produk
          hanya menawarkan opsi aktif plus current archived value, dan inline create dapat memulihkan item lama bila terjadi archived conflict.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <MasterDataManager
          singularLabel="Kategori"
          pluralLabel="Kategori"
          items={sampleItems}
          onCreate={async (input) => ({ id: "cat-new", name: input.name.trim(), active: true })}
          onRename={async (id, input) => ({ id, name: input.name.trim(), active: true })}
          onArchive={async (id) => ({ id, name: "Minuman", active: false })}
          onRestore={async (id) => ({ id, name: "Lama", active: true })}
        />
        <div className="rounded-card border border-border bg-surface-muted/40 p-3">
          <MasterDataSelectField
            entityLabel="Kategori"
            value="cat-3"
            items={sampleItems}
            onChange={() => {}}
            onCreate={async (input) => ({ id: "cat-new", name: input.name.trim(), active: true })}
            onRestore={async (id) => ({ id, name: "Lama", active: true })}
          />
        </div>
      </div>
    </section>
  );
}
