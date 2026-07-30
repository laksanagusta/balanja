import React from "react";
import { Drawer } from "vaul";
import { Icon } from "../primitives.jsx";

const DEFAULT_MOVEMENT_TYPE = "Semua pergerakan";
const MOVEMENT_TYPE_OPTIONS = [
  DEFAULT_MOVEMENT_TYPE,
  "Penjualan",
  "Tambah stok",
  "Kurangi stok",
  "Set pasti",
];

export function StockFilterDrawer({
  open,
  onOpenChange,
  type = DEFAULT_MOVEMENT_TYPE,
  onTypeChange,
  label = "Filter stok",
}) {
  const [draftType, setDraftType] = React.useState(type);
  const activeFilterCount = Number(draftType !== DEFAULT_MOVEMENT_TYPE);

  React.useEffect(() => {
    if (!open) return;
    setDraftType(type);
  }, [open, type]);

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) setDraftType(type);
    onOpenChange(nextOpen);
  };

  const applyFilters = () => {
    onTypeChange?.(draftType);
    onOpenChange(false);
  };

  const resetDraft = () => {
    setDraftType(DEFAULT_MOVEMENT_TYPE);
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
          className="header-compact-action stock-filter-trigger group relative grid size-11 shrink-0 place-items-center rounded-control bg-transparent text-text transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Icon name="filter" className="size-5" />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="product-filter-drawer-overlay fixed inset-0 z-[70] bg-black/25" />
        <Drawer.Content
          aria-describedby={undefined}
          className="product-filter-drawer corner-smoothing-overlay fixed inset-x-0 bottom-0 z-[80] mx-auto flex max-h-[min(86svh,40rem)] w-full max-w-[1200px] flex-col rounded-t-panel border border-border bg-surface outline-none shadow-panel"
        >
          <Drawer.Handle className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-border" />

          <div className="overlay-sticky-header relative px-6 pt-6">
            <Drawer.Title className="min-w-0 pr-12 text-lg font-semibold tracking-[-0.01em] text-text">
              Filter stok
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

          <div className="product-filter-drawer-scroll min-h-0 flex-1 overflow-y-auto px-6 pt-6">
            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-text">Jenis pergerakan</legend>
              <div className="flex min-w-0 flex-wrap gap-1">
                {MOVEMENT_TYPE_OPTIONS.map((option) => {
                  const selected = draftType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDraftType(option)}
                      className="group grid min-h-11 place-items-center px-0.5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
                    >
                      <span
                        className={`pointer-events-none inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-[transform,background-color,border-color,color] duration-fast ease-standard group-active:scale-[0.97] motion-reduce:group-active:scale-100 ${
                          selected
                            ? "border-accent bg-accent text-white"
                            : "border-border bg-surface text-text group-hover:bg-surface-muted"
                        }`}
                      >
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
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
