import React from "react";
import { Drawer } from "vaul";
import { Icon, useOverlayDepth } from "../primitives.jsx";

export const DEFAULT_TRANSACTION_SORT = "createdAt:desc";

const SORT_OPTIONS = [
  { value: DEFAULT_TRANSACTION_SORT, label: "Transaksi terbaru" },
  { value: "createdAt:asc", label: "Transaksi terlama" },
  { value: "total:desc", label: "Total terbesar" },
  { value: "total:asc", label: "Total terkecil" },
  { value: "number:asc", label: "Nomor A–Z" },
  { value: "number:desc", label: "Nomor Z–A" },
];

function Pills({ label, value, options, onChange }) {
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
              <span className={`pointer-events-none inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-[transform,background-color,border-color,color] duration-fast ease-standard group-active:scale-[0.97] motion-reduce:group-active:scale-100 ${
                selected
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-text group-hover:bg-surface-muted"
              }`}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function DateField({ label, value, min, max, onChange }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-text">
      <span>{label}</span>
      <input
        type="date"
        value={value}
        min={min || undefined}
        max={max || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-card border border-border bg-surface px-3 text-sm font-medium text-text shadow-inner-soft outline-none focus:border-border-strong focus:outline-1 focus:outline-focus/30"
      />
    </label>
  );
}

export function TransactionFilterDrawer({
  open,
  onOpenChange,
  sort = DEFAULT_TRANSACTION_SORT,
  onSortChange,
  paymentMethod,
  onPaymentMethodChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  label = "Filter transaksi",
}) {
  useOverlayDepth(open);
  const [draftSort, setDraftSort] = React.useState(sort);
  const [draftPaymentMethod, setDraftPaymentMethod] = React.useState(paymentMethod);
  const [draftDateFrom, setDraftDateFrom] = React.useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = React.useState(dateTo);
  const activeDraftCount = [draftPaymentMethod, draftDateFrom, draftDateTo].filter(Boolean).length
    + Number(draftSort !== DEFAULT_TRANSACTION_SORT);

  const syncDraft = React.useCallback(() => {
    setDraftSort(sort);
    setDraftPaymentMethod(paymentMethod);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
  }, [dateFrom, dateTo, paymentMethod, sort]);

  React.useEffect(() => {
    if (open) syncDraft();
  }, [open, syncDraft]);

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) syncDraft();
    onOpenChange(nextOpen);
  };

  const applyFilters = () => {
    onSortChange?.(draftSort);
    onPaymentMethodChange?.(draftPaymentMethod);
    onDateFromChange?.(draftDateFrom);
    onDateToChange?.(draftDateTo);
    onOpenChange(false);
  };

  const resetDraft = () => {
    setDraftSort(DEFAULT_TRANSACTION_SORT);
    setDraftPaymentMethod("");
    setDraftDateFrom("");
    setDraftDateTo("");
  };

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange} direction="bottom" dismissible modal shouldScaleBackground={false}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="header-compact-action group relative grid size-11 shrink-0 place-items-center rounded-control bg-transparent text-text transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
              Filter transaksi
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
              <Pills label="Urutkan" value={draftSort} options={SORT_OPTIONS} onChange={setDraftSort} />
              <Pills
                label="Metode pembayaran"
                value={draftPaymentMethod}
                options={[
                  { value: "", label: "Semua metode" },
                  { value: "cash", label: "Tunai" },
                  { value: "qris", label: "QRIS" },
                ]}
                onChange={setDraftPaymentMethod}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <DateField label="Tanggal dari" value={draftDateFrom} max={draftDateTo} onChange={setDraftDateFrom} />
                <DateField label="Tanggal sampai" value={draftDateTo} min={draftDateFrom} onChange={setDraftDateTo} />
              </div>
            </div>
          </div>

          <div className="product-filter-drawer-footer grid grid-cols-[auto_minmax(0,1fr)] gap-2 bg-surface px-6 pt-6">
            <button
              type="button"
              disabled={activeDraftCount === 0}
              onClick={resetDraft}
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
