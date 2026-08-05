import React from "react";
import { Button, Icon, Input, Switch } from "../primitives.jsx";
import { SwapText } from "../motion/SwapText.jsx";
import MasterDataSelectField from "./MasterDataSelectField.jsx";
import { ProductPhotoField } from "./ProductPhotoField.jsx";
import ProductVariantEditor from "./ProductVariantEditor.jsx";

export default function ProductEditorWorkspace({
  editing,
  editorStep,
  headingRef,
  primaryFieldRef,
  discardConfirmOpen,
  savingProduct,
  productErrors,
  categories,
  units,
  photoPreviewURL,
  variantUndoMessage,
  onBack,
  onSubmit,
  onContinueEditing,
  onDiscard,
  onStepChange,
  onOpenVariantEditor,
  onUpdate,
  onBlurField,
  onSelectPhoto,
  onRemovePhoto,
  onCreateCategory,
  onRestoreCategory,
  onCreateUnit,
  onRestoreUnit,
  onScanProductBarcode,
  onUndoVariant,
  onAddAttribute,
  onRenameAttribute,
  onCommitOptions,
  onDuplicateAttribute,
  onMoveAttribute,
  onRemoveAttribute,
  onBlurAttributeField,
  onUpdateVariant,
  onBlurVariantField,
  onApplyBulk,
  onSetAllActive,
  onScanVariantBarcode,
  formatNumberInput,
  normalizeNumberField,
}) {
  const isVariantsStep = editorStep === "variants";
  const title = editing.id ? "Ubah produk" : "Tambah produk";

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-surface text-text">
      <header className="product-editor-material sticky top-0 z-20 shrink-0 bg-surface/92 px-4 pb-4 pt-3 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/78 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <button
              type="button"
              disabled={savingProduct}
              onClick={onBack}
              aria-label="Kembali ke daftar produk"
              className="inline-flex min-h-11 justify-self-start items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-text-muted transition-[transform,background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
            >
              <Icon name="chevron-left" className="size-4" />
              Kembali ke daftar
            </button>
            <h1 className="max-w-[45vw] truncate text-center text-sm font-semibold uppercase tracking-[0.14em] text-text sm:max-w-none">{title}</h1>
            <span aria-hidden="true" />
          </div>

          {!discardConfirmOpen && (
            <div className="mt-3">
              <h2 ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-text outline-none">
                {isVariantsStep ? "Atur variasi" : "Informasi produk"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
                {isVariantsStep
                  ? "Setiap kombinasi pilihan menjadi satu variasi dengan harga, stok, dan barcode sendiri."
                  : "Lengkapi informasi utama yang digunakan di katalog dan transaksi."}
              </p>
            </div>
          )}
        </div>
      </header>

      <main id="product-editor-content" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6">
        {discardConfirmOpen ? (
          <section className="mx-auto grid min-h-full w-full max-w-xl content-center gap-1 py-8" role="alert" aria-labelledby="discard-product-title">
            <h2 id="discard-product-title" ref={headingRef} tabIndex={-1} className="text-sm font-semibold outline-none">Buang perubahan?</h2>
            <p className="max-w-md text-sm leading-6 text-text-muted">Perubahan produk yang belum disimpan akan hilang.</p>
          </section>
        ) : (
          <form id="product-form" noValidate onSubmit={onSubmit} className="grid text-text">
            {!isVariantsStep ? (
              <div className="mx-auto grid w-full max-w-xl gap-2 py-5 sm:py-6">
                <Input
                  label="Nama"
                  placeholder="Beras Ramos 5kg"
                  error={productErrors.name}
                  inputProps={{
                    ref: primaryFieldRef,
                    value: editing.name,
                    onChange: (event) => onUpdate("name", event.target.value),
                    onBlur: () => onBlurField?.("name"),
                    required: true,
                    disabled: savingProduct,
                  }}
                />

                <div className="grid gap-2">
                  <span className="text-sm font-semibold text-text">Barcode</span>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        placeholder="8991001000011"
                        error={productErrors.barcode}
                        inputClassName="font-mono tabular-nums tracking-[0.01em]"
                        inputProps={{
                          value: editing.barcode,
                          onChange: (event) => onUpdate("barcode", event.target.value),
                          onBlur: () => onBlurField?.("barcode"),
                          required: true,
                          disabled: savingProduct,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Pindai barcode"
                      title="Pindai barcode"
                      disabled={savingProduct}
                      onClick={onScanProductBarcode}
                      className="grid size-11 shrink-0 place-items-center rounded-control text-text-muted transition-[transform,background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <Icon name="scan" className="size-5" />
                    </button>
                  </div>
                </div>

                <MasterDataSelectField
                  entityLabel="Kategori"
                  value={editing.categoryId}
                  items={categories}
                  onChange={(value) => onUpdate("categoryId", value)}
                  onCreate={onCreateCategory}
                  onRestore={onRestoreCategory}
                  onBlur={() => onBlurField?.("categoryId")}
                  disabled={savingProduct}
                  error={productErrors.categoryId}
                />

                {editing.attributesConfig.length === 0 && (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                    <Input
                      label="Harga"
                      placeholder="72000"
                      error={productErrors.price}
                      inputClassName="font-mono tabular-nums"
                      inputProps={{
                        value: formatNumberInput(editing.price),
                        onChange: (event) => onUpdate("price", normalizeNumberField(event.target.value)),
                        onBlur: () => onBlurField?.("price"),
                        inputMode: "numeric",
                        required: true,
                        disabled: savingProduct,
                      }}
                    />
                    <Input
                      label="Stok"
                      placeholder={editing.id ? "Dikelola oleh transaksi penjualan dan penyesuaian stok" : "18"}
                      error={productErrors.stock}
                      inputClassName="font-mono tabular-nums"
                      inputProps={{
                        value: formatNumberInput(editing.stock),
                        onChange: editing.id ? undefined : (event) => onUpdate("stock", normalizeNumberField(event.target.value)),
                        onBlur: () => onBlurField?.("stock"),
                        inputMode: "numeric",
                        required: true,
                        disabled: Boolean(editing.id) || savingProduct,
                      }}
                    />
                  </div>
                )}

                <MasterDataSelectField
                  entityLabel="Satuan"
                  value={editing.unitId}
                  items={units}
                  onChange={(value) => onUpdate("unitId", value)}
                  onCreate={onCreateUnit}
                  onRestore={onRestoreUnit}
                  onBlur={() => onBlurField?.("unitId")}
                  disabled={savingProduct}
                  error={productErrors.unitId}
                />

                <ProductPhotoField
                  product={{ ...editing, image: editing.removeImage ? "" : editing.image }}
                  previewURL={photoPreviewURL}
                  filename={editing.imageFile?.name}
                  error={productErrors.image}
                  disabled={savingProduct}
                  onSelect={onSelectPhoto}
                  onRemove={onRemovePhoto}
                />

                <div className="flex items-center justify-between gap-3 rounded-panel border border-border bg-surface-muted/40 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">
                      {editing.attributesConfig.length > 0 ? `${editing.variants.length} variasi` : "Produk tanpa variasi"}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-text-muted">
                      {editing.attributesConfig.length > 0
                        ? "Harga, stok, dan barcode mengikuti setiap kombinasi pilihan."
                        : "Gunakan satu harga dan stok, atau tambahkan variasi jika produk punya ukuran atau warna berbeda."}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" className="whitespace-nowrap" disabled={savingProduct} onClick={onOpenVariantEditor}>
                    {editing.attributesConfig.length > 0 ? "Atur variasi" : "Tambah variasi"}
                  </Button>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={editing.active}
                  disabled={savingProduct}
                  onClick={() => onUpdate("active", !editing.active)}
                  className="flex h-11 items-center justify-between rounded-button border border-border bg-surface px-3.5 text-sm font-semibold text-text transition-[transform,background-color,border-color] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
                >
                  <span>Aktif</span>
                  <Switch checked={editing.active} tone="success" decorative />
                </button>
              </div>
            ) : (
              <div className="mx-auto grid w-full max-w-7xl gap-3 py-5 sm:py-6">
                <ProductVariantEditor
                  product={editing}
                  errors={productErrors}
                  disabled={savingProduct}
                  undoMessage={variantUndoMessage}
                  onUndo={onUndoVariant}
                  onAddAttribute={onAddAttribute}
                  onRenameAttribute={onRenameAttribute}
                  onCommitOptions={onCommitOptions}
                  onDuplicateAttribute={onDuplicateAttribute}
                  onMoveAttribute={onMoveAttribute}
                  onRemoveAttribute={onRemoveAttribute}
                  onBlurAttributeField={onBlurAttributeField}
                  onUpdateVariant={onUpdateVariant}
                  onBlurVariantField={onBlurVariantField}
                  onApplyBulk={onApplyBulk}
                  onSetAllActive={onSetAllActive}
                  onScanBarcode={onScanVariantBarcode}
                />
              </div>
            )}
          </form>
        )}
      </main>

      <footer className="product-editor-material sticky bottom-0 z-20 shrink-0 bg-surface/94 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/82 sm:px-6 sm:pb-4">
        <div className="mx-auto w-full max-w-7xl">
          {productErrors.form && (
            <p role="alert" className="mb-2 rounded-control border border-danger bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {productErrors.form}
            </p>
          )}
          <div className="form-actions w-full sm:mx-auto sm:max-w-md">
            {discardConfirmOpen ? (
              <>
                <Button type="button" onClick={onContinueEditing}>Lanjut mengedit</Button>
                <Button type="button" variant="danger" onClick={onDiscard}>Buang perubahan</Button>
              </>
            ) : (
              <>
                {isVariantsStep && (
                  <Button type="button" disabled={savingProduct} onClick={() => onStepChange("details")}>Kembali ke informasi</Button>
                )}
                <Button type="submit" variant="primary" form="product-form" disabled={savingProduct} className="min-w-28">
                  <SwapText value={savingProduct ? "Menyimpan..." : "Simpan"} />
                </Button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
