import React from "react";
import { Drawer } from "vaul";
import { Icon, useOverlayDepth } from "../primitives.jsx";

const DEFAULT_SORT = "createdAt:desc";
const PRODUCT_SORT_OPTIONS = [
  { value: DEFAULT_SORT, label: "Terbaru ditambahkan" },
  { value: "createdAt:asc", label: "Terlama ditambahkan" },
  { value: "name:asc", label: "Nama A–Z" },
  { value: "name:desc", label: "Nama Z–A" },
  { value: "stock:asc", label: "Stok paling sedikit" },
  { value: "stock:desc", label: "Stok paling banyak" },
  { value: "price:asc", label: "Harga terendah" },
  { value: "price:desc", label: "Harga tertinggi" },
];

function FilterOptions({ label, value, options, onChange }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold text-text">{label}</legend>
      <div className="flex min-w-0 flex-wrap gap-1">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value || "all"}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className="group grid min-h-11 place-items-center px-0.5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
            >
              <span
                className={`pointer-events-none inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-[transform,background-color,border-color,color] duration-fast ease-standard group-active:scale-[0.97] motion-reduce:group-active:scale-100 ${
                  selected
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface text-text group-hover:bg-surface-muted"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProductFilterDrawer({
  open,
  onOpenChange,
  sort = DEFAULT_SORT,
  onSortChange,
  category,
  categoryOptions = [],
  onCategoryChange,
  status,
  onStatusChange,
  label = "Filter produk",
}) {
  useOverlayDepth(open);
  const [draftSort, setDraftSort] = React.useState(sort);
  const [draftCategory, setDraftCategory] = React.useState(category);
  const [draftStatus, setDraftStatus] = React.useState(status);
  const activeFilterCount = [draftCategory, draftStatus].filter(Boolean).length
    + Number(draftSort !== DEFAULT_SORT);

  React.useEffect(() => {
    if (!open) return;
    setDraftSort(sort);
    setDraftCategory(category);
    setDraftStatus(status);
  }, [category, open, sort, status]);

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      setDraftSort(sort);
      setDraftCategory(category);
      setDraftStatus(status);
    }
    onOpenChange(nextOpen);
  };

  const applyFilters = () => {
    onSortChange?.(draftSort);
    onCategoryChange?.(draftCategory);
    onStatusChange?.(draftStatus);
    onOpenChange(false);
  };

  const resetDraft = () => {
    setDraftSort(DEFAULT_SORT);
    setDraftCategory("");
    setDraftStatus("");
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={handleOpenChange}
      direction="bottom"
      dismissible
      modal
      shouldScaleBackground={false}
    >
      <Drawer.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="header-compact-action product-filter-trigger group relative grid size-11 shrink-0 place-items-center rounded-control bg-transparent text-text transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Icon name="filter" className="size-5" />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="product-filter-drawer-overlay fixed inset-0 z-[70] bg-white/30 backdrop-blur-sm" />
        <Drawer.Content
          aria-describedby={undefined}
          className="product-filter-drawer fixed inset-x-0 bottom-0 z-[80] mx-auto flex max-h-[min(86svh,40rem)] w-full max-w-[1200px] flex-col overflow-hidden rounded-t-overlay border border-border bg-surface outline-none shadow-panel"
        >
          <Drawer.Handle className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-border" />

          <div className="overlay-sticky-header relative px-6 pt-6">
            <Drawer.Title className="min-w-0 pr-12 text-lg font-semibold tracking-[-0.01em] text-text">
              Filter produk
            </Drawer.Title>
            <Drawer.Close asChild>
              <button
                type="button"
                aria-label="Tutup filter"
                className="absolute right-6 top-4 grid size-11 place-items-center rounded-control text-text-muted transition-[transform,background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Icon name="x" className="size-5" />
              </button>
            </Drawer.Close>
          </div>

          <div className="relative z-0 min-h-0 flex-1 overflow-y-auto px-6 pt-6">
            <div className="grid gap-4">
              <FilterOptions
                label="Urutkan"
                value={draftSort}
                options={PRODUCT_SORT_OPTIONS}
                onChange={setDraftSort}
              />
              <FilterOptions
                label="Kategori"
                value={draftCategory}
                options={categoryOptions}
                onChange={setDraftCategory}
              />
              <FilterOptions
                label="Status"
                value={draftStatus}
                options={[
                  { value: "", label: "Semua status" },
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
                onChange={setDraftStatus}
              />
            </div>
          </div>

          <div className="product-filter-drawer-footer grid grid-cols-[auto_minmax(0,1fr)] gap-2 bg-surface px-6 pt-6">
            <button
              type="button"
              onClick={resetDraft}
              disabled={activeFilterCount === 0}
              className="min-h-11 rounded-card border border-border bg-surface px-4 text-sm font-semibold text-text transition-[transform,background-color] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-40"
            >
              Atur ulang
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="min-h-11 rounded-card bg-accent px-4 text-sm font-semibold text-white transition-[transform,background-color] duration-fast ease-standard hover:bg-accent-hover active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Terapkan
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
