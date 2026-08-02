import React from "react";
import { ProductList } from "../product/ProductList.jsx";
import ProductVariantEditor from "../product/ProductVariantEditor.jsx";
import { VariantSelector } from "../pos/VariantSelector.jsx";
import {
  applyVariantBulkValues,
  attributesKey,
  buildVariantMatrix,
  duplicateVariantAttribute,
  moveVariantAttribute,
  renameVariantAttribute,
  withVariantDraftIdentity,
} from "../../product/product-variant-form.js";

const variantProduct = {
  id: "variant-showcase-tea",
  name: "Es Teh Nusantara",
  barcode: "8991001000882",
  category: "Minuman",
  unit: "gelas",
  price: 8000,
  stock: 9,
  active: true,
  attributesConfig: [
    { name: "Ukuran", options: ["M", "L"] },
    { name: "Gula", options: ["Normal", "Sedikit"] },
  ],
  variants: [
    { id: "m-normal", attributes: { Ukuran: "M", Gula: "Normal" }, price: 8000, stock: 4, active: true },
    { id: "m-less", attributes: { Ukuran: "M", Gula: "Sedikit" }, price: 8000, stock: 0, active: true },
    { id: "l-normal", attributes: { Ukuran: "L", Gula: "Normal" }, price: 10000, stock: 3, active: true },
    { id: "l-less", attributes: { Ukuran: "L", Gula: "Sedikit" }, price: 10000, stock: 2, active: true },
  ],
};

export default function ProductVariantShowcase() {
  const [draft, setDraft] = React.useState(() => {
    const identified = withVariantDraftIdentity(variantProduct.attributesConfig, variantProduct.variants);
    return { ...variantProduct, attributesConfig: identified.config, variants: identified.variants };
  });
  const [undo, setUndo] = React.useState(null);

  const remember = (message) => setUndo({
    message,
    attributesConfig: draft.attributesConfig,
    variants: draft.variants,
  });

  const rebuild = (config, message) => {
    remember(message);
    setDraft((current) => ({
      ...current,
      attributesConfig: config,
      variants: buildVariantMatrix(config, current.variants, { price: current.price, stock: 0 }),
    }));
  };

  return (
    <section className="rounded-panel border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Product variants</p>
      <h3 className="mt-2 text-xl font-semibold text-text">Matrix editor, compact summary, dan sellable selector</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
        Simpan parent dan matrix secara atomik. Setiap kombinasi menjaga ID dan nilai operasionalnya,
        tetapi gunakan halaman editor khusus dengan dua tahap tanpa step indicator agar informasi produk dan editor variasi tidak menjadi satu form panjang atau modal bertumpuk.
        Gunakan heading operasional 14px secara konsisten, field token setinggi text field dengan affordance Enter,
        chip yang lebih kecil dari permukaan field, label visual singkat, tombol aksi berbentuk pill,
        disclosure inline untuk detail variasi mobile, dan alignment field-action tanpa offset manual.
        Saat pengguna memperbaiki field, metadata error yang sudah kosong harus dibuang tanpa membuka ulang disclosure atau memindahkan fokus.
        Kasir tetap melihat pilihan yang tersedia, harga aktual, serta stok setelah isi keranjang diperhitungkan.
      </p>
      <div className="mt-4 rounded-panel border border-border bg-surface p-4">
        <ProductVariantEditor
          product={draft}
          undoMessage={undo?.message}
          onUndo={() => {
            setDraft((current) => ({ ...current, attributesConfig: undo.attributesConfig, variants: undo.variants }));
            setUndo(null);
          }}
          onAddAttribute={() => rebuild(
            [...draft.attributesConfig, { name: `Atribut ${draft.attributesConfig.length + 1}`, options: [] }],
            "Atribut ditambahkan.",
          )}
          onRenameAttribute={(index, name) => setDraft((current) => {
            const { config, variants } = renameVariantAttribute(current.attributesConfig, current.variants, index, name);
            return { ...current, attributesConfig: config, variants };
          })}
          onCommitOptions={(index, options) => rebuild(
            draft.attributesConfig.map((attribute, itemIndex) => (itemIndex === index ? { ...attribute, options } : attribute)),
            "Pilihan dan matriks variasi diperbarui.",
          )}
          onDuplicateAttribute={(index) => {
            const result = duplicateVariantAttribute(draft.attributesConfig, draft.variants, index, { price: draft.price, stock: 0 });
            remember(`${result.variants.length - draft.variants.length} variasi ditambahkan.`);
            setDraft((current) => ({ ...current, attributesConfig: result.config, variants: result.variants }));
          }}
          onMoveAttribute={(fromIndex, toIndex) => {
            const result = moveVariantAttribute(draft.attributesConfig, draft.variants, fromIndex, toIndex);
            remember("Urutan atribut diperbarui.");
            setDraft((current) => ({ ...current, attributesConfig: result.config, variants: result.variants }));
          }}
          onRemoveAttribute={(index) => rebuild(
            draft.attributesConfig.filter((_, itemIndex) => itemIndex !== index),
            "Atribut dihapus.",
          )}
          onUpdateVariant={(key, field, value) => setDraft((current) => ({
            ...current,
            variants: current.variants.map((variant) => (attributesKey(variant.attributes) === key ? { ...variant, [field]: value } : variant)),
          }))}
          onApplyBulk={(values, message) => {
            remember(message);
            setDraft((current) => ({ ...current, variants: applyVariantBulkValues(current.variants, values) }));
          }}
          onSetAllActive={(active, message) => {
            remember(message);
            setDraft((current) => ({
              ...current,
              variants: current.variants.map((variant) => ({ ...variant, active })),
            }));
          }}
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-panel border border-border bg-surface">
          <ProductList
            products={[draft]}
            onSelect={() => {}}
            getCategory={(product) => product.category}
            getUnit={(product) => product.unit}
          />
        </div>
        <div className="rounded-panel border border-border bg-surface px-6 pt-6">
          <VariantSelector product={draft} onChoose={() => ({ ok: true })} />
        </div>
      </div>
    </section>
  );
}
