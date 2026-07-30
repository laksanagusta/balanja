import React from "react";
import { Badge, Button, Input, SelectField } from "../primitives.jsx";
import BackgroundUpdateStatus from "../feedback/BackgroundUpdateStatus.jsx";

const presets = [
  ["today", "Hari ini"], ["7d", "7 hari"], ["30d", "30 hari"], ["month", "Bulan ini"], ["custom", "Rentang khusus"],
];

export default function SalesReportToolbar({ filters, cashierOptions = [], error = "", exporting = "", refreshError = "", hasUnappliedChanges = false, actionsDisabled = false, isUpdating = false, onChange, onPreset, onApply, onReset, onExport, onHandoff }) {
  const activeFilters = [filters.paymentMethod, filters.cashierUserId].filter(Boolean).length;
  const filterPanelId = React.useId();
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);
  const submit = (event) => {
    event.preventDefault();
    onApply();
  };
  return (
    <form className="grid shrink-0 gap-3 bg-surface px-4 py-3" onSubmit={submit}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          compactVisual
          variant="secondary"
          aria-expanded={filtersExpanded}
          aria-controls={filterPanelId}
          onClick={() => setFiltersExpanded((expanded) => !expanded)}
        >
          {filtersExpanded ? "Sembunyikan filter" : "Tampilkan filter"}
        </Button>
        {activeFilters > 0 && <Badge>{activeFilters} filter aktif</Badge>}
        <BackgroundUpdateStatus active={isUpdating} label="Memperbarui laporan penjualan" />
        {hasUnappliedChanges ? <span className="ml-auto text-xs font-semibold text-text-muted">Perubahan belum diterapkan</span> : null}
      </div>
      <div
        id={filterPanelId}
        className={`${filtersExpanded ? "grid" : "hidden"} max-h-[min(70svh,32rem)] gap-3 overflow-y-auto overscroll-contain pr-1`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {presets.map(([value, label]) => (
            <Button key={value} type="button" size="sm" compactVisual variant={filters.preset === value ? "secondary" : "ghost"} aria-pressed={filters.preset === value} onClick={() => onPreset(value)}>{label}</Button>
          ))}
        </div>
        <div className="grid gap-3">
          <Input label="Tanggal dari" error={error} inputProps={{ type: "date", value: filters.dateFrom, max: filters.dateTo, onChange: (event) => onChange({ dateFrom: event.target.value, preset: "custom" }) }} />
          <Input label="Tanggal sampai" inputProps={{ type: "date", value: filters.dateTo, min: filters.dateFrom, onChange: (event) => onChange({ dateTo: event.target.value, preset: "custom" }) }} />
          <SelectField label="Metode pembayaran" value={filters.paymentMethod} onChange={(paymentMethod) => onChange({ paymentMethod })} options={[{ value: "", label: "Semua metode" }, { value: "cash", label: "Tunai" }, { value: "qris", label: "QRIS" }]} />
          <SelectField label="Kasir" value={filters.cashierUserId} onChange={(cashierUserId) => onChange({ cashierUserId })} options={[{ value: "", label: "Semua kasir" }, ...cashierOptions.map((option) => ({ value: option.cashierUserId, label: option.label }))]} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" compactVisual variant="primary" disabled={!hasUnappliedChanges || isUpdating}>Terapkan</Button>
            <Button type="button" size="sm" compactVisual variant="ghost" onClick={onReset}>Reset</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" compactVisual variant="secondary" aria-label="Ekspor ringkasan harian CSV" disabled={actionsDisabled || Boolean(exporting)} onClick={() => onExport("daily")}>{exporting === "daily" ? "Membuat CSV…" : "CSV harian"}</Button>
          <Button type="button" size="sm" compactVisual variant="secondary" aria-label="Ekspor detail transaksi CSV" disabled={actionsDisabled || Boolean(exporting)} onClick={() => onExport("transactions")}>{exporting === "transactions" ? "Membuat CSV…" : "CSV transaksi"}</Button>
          <Button type="button" size="sm" compactVisual variant="ghost" disabled={actionsDisabled} onClick={onHandoff}>Lihat transaksi</Button>
        </div>
      </div>
      {refreshError && <p role="alert" className="rounded-card border border-warning/20 bg-warning-soft px-3 py-2 text-xs font-medium text-warning">{refreshError}</p>}
    </form>
  );
}
