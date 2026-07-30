import React from "react";
import { Drawer } from "vaul";
import { Icon } from "../primitives.jsx";

export function PosFilterDrawer({
  open,
  onOpenChange,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
  onReset,
  searchInputRef,
  iconOnly = false,
  className = "",
}) {
  const categoryTabsRef = React.useRef(null);
  const categoryTabRefs = React.useRef(new Map());
  const [categoryIndicator, setCategoryIndicator] = React.useState({
    left: 0,
    width: 0,
    ready: false,
  });
  const activeFilterCount = Number(Boolean(query.trim())) + Number(Boolean(category));

  const updateCategoryIndicator = React.useCallback(() => {
    const activeTab = categoryTabRefs.current.get(category);
    if (!activeTab) return;

    setCategoryIndicator((current) => {
      const next = {
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
        ready: true,
      };
      return current.left === next.left
        && current.width === next.width
        && current.ready
        ? current
        : next;
    });
  }, [category]);

  React.useLayoutEffect(() => {
    if (!open) return undefined;
    const tabs = categoryTabsRef.current;
    const activeTab = categoryTabRefs.current.get(category);
    if (!tabs || !activeTab) return undefined;

    activeTab.scrollIntoView({ block: "nearest", inline: "nearest" });
    updateCategoryIndicator();

    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateCategoryIndicator);
    observer?.observe(tabs);
    observer?.observe(activeTab);
    window.addEventListener("resize", updateCategoryIndicator);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateCategoryIndicator);
    };
  }, [category, categories.length, open, updateCategoryIndicator]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      direction="bottom"
      dismissible
      modal
      shouldScaleBackground={false}
    >
      <Drawer.Trigger asChild>
        <button
          type="button"
          aria-label={iconOnly ? "Filter produk" : undefined}
          title={iconOnly ? "Filter produk" : undefined}
          className={`header-compact-action pos-filter-trigger group pos-touch-target relative h-11 min-w-0 rounded-control bg-transparent text-sm font-semibold text-text transition-colors duration-fast hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${iconOnly ? "w-11 px-0" : "px-1.5"} ${className}`}
        >
          <span className={`header-compact-action-surface pointer-events-none relative inline-flex items-center justify-center gap-2 transition-transform duration-fast ease-standard group-active:scale-[0.97] ${iconOnly ? "size-11" : "h-9 w-full rounded-control border border-border bg-surface px-3.5"}`}>
            <Icon name="filter" className={iconOnly ? "size-5" : "size-4"} />
            {!iconOnly && <span>Filter</span>}
            {activeFilterCount > 0 && (
              <span className={`${iconOnly ? "absolute -right-0.5 -top-0.5 size-4 px-0 text-[9px]" : "min-w-5 px-1.5 text-xs"} grid place-items-center rounded-full bg-accent font-semibold tabular-nums text-white`}>
                {activeFilterCount}
              </span>
            )}
          </span>
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="pos-filter-drawer-overlay fixed inset-0 z-[70] bg-black/25" />
        <Drawer.Content
          aria-describedby={undefined}
          className="pos-filter-drawer corner-smoothing-overlay fixed inset-x-0 bottom-0 z-[80] mx-auto flex max-h-[min(86svh,42rem)] w-full max-w-[1200px] flex-col rounded-t-panel border border-border bg-surface outline-none shadow-panel"
        >
          <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-border" aria-hidden="true" />

          <div className="overlay-sticky-header relative px-6 pt-6">
            <Drawer.Title className="min-w-0 pr-12 text-lg font-semibold tracking-[-0.01em] text-text">
              Filter produk
            </Drawer.Title>
            <Drawer.Close asChild>
              <button
                type="button"
                aria-label="Tutup filter"
                className="pos-icon-touch-target absolute right-6 top-4 grid size-11 place-items-center rounded-control text-text-muted transition-[transform,background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Icon name="x" className="size-5" />
              </button>
            </Drawer.Close>
          </div>

          <div className="pos-filter-drawer-scroll min-h-0 flex-1 overflow-y-auto px-6 pt-6">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-text">Cari produk</span>
                <span className="flex h-12 min-w-0 items-center gap-3 rounded-card border border-border bg-surface px-3.5 shadow-inner-soft focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus/30">
                  <Icon name="search" className="size-4 shrink-0 text-text-muted" />
                  <input
                    ref={searchInputRef}
                    className="min-w-0 flex-1 bg-transparent text-base font-medium text-text outline-none placeholder:text-text-subtle sm:text-sm"
                    name="productSearch"
                    autoComplete="off"
                    aria-label="Cari produk atau barcode"
                    aria-keyshortcuts="Meta+K Control+K"
                    placeholder="Nama produk atau barcode…"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Hapus pencarian"
                      onClick={() => onQueryChange("")}
                      className="pos-icon-touch-target grid size-8 shrink-0 place-items-center rounded-control text-text-muted transition-[transform,background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <Icon name="x" className="size-4" />
                    </button>
                  )}
                </span>
              </label>

              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-text">Kategori</legend>
                <div
                  ref={categoryTabsRef}
                  className="category-tabs relative flex w-full min-w-0 gap-1 overflow-x-auto rounded-control border border-border bg-surface-muted p-1"
                  aria-label="Kategori produk"
                >
                  <span
                    aria-hidden="true"
                    className="category-tabs-indicator"
                    style={{
                      "--category-indicator-x": `${categoryIndicator.left}px`,
                      "--category-indicator-width": `${categoryIndicator.width}px`,
                      opacity: categoryIndicator.ready ? 1 : 0,
                    }}
                  />
                  {categories.map((entry) => (
                    <button
                      ref={(node) => {
                        if (node) categoryTabRefs.current.set(entry.value, node);
                        else categoryTabRefs.current.delete(entry.value);
                      }}
                      key={entry.value || "all"}
                      type="button"
                      aria-pressed={category === entry.value}
                      onClick={() => onCategoryChange(entry.value)}
                      className={`pos-touch-target relative z-10 h-9 min-w-max flex-1 basis-0 rounded-md px-4 text-sm font-medium transition-[transform,color,background-color] duration-base ease-standard active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                        category === entry.value
                          ? categoryIndicator.ready
                            ? "text-text"
                            : "bg-surface text-text"
                          : "text-text-muted hover:text-text"
                      }`}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          <div className="pos-filter-drawer-footer grid grid-cols-[auto_minmax(0,1fr)] gap-2 bg-surface px-6 pt-6">
            <button
              type="button"
              onClick={onReset}
              disabled={activeFilterCount === 0}
              className="min-h-11 rounded-card border border-border bg-surface px-4 text-sm font-semibold text-text transition-[transform,background-color] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-40"
            >
              Reset
            </button>
            <Drawer.Close asChild>
              <button
                type="button"
                className="min-h-11 rounded-card bg-accent px-4 text-sm font-semibold text-white transition-[transform,background-color] duration-fast ease-standard hover:bg-accent-hover active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Tampilkan produk
              </button>
            </Drawer.Close>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
