import React from "react";
import { Badge, Button, Input, SelectField } from "../primitives.jsx";

const presets = [
  ["today", "Hari ini"], ["7d", "7 hari"], ["30d", "30 hari"], ["month", "Bulan ini"], ["custom", "Rentang khusus"],
];

export default function SalesReportToolbar({ filters, cashierOptions = [], error = "", exporting = "", refreshError = "", hasUnappliedChanges = false, actionsDisabled = false, isUpdating = false, onChange, onPreset, onApply, onReset, onExport, onHandoff }) {
  const activeFilters = [filters.paymentMethod, filters.cashierUserId].filter(Boolean).length;
  const submit = (event) => {
    event.preventDefault();
    onApply();
  };
  return (
    <form className="grid gap-3 border-b border-border bg-surface px-4 py-3" onSubmit={submit}>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map(([value, label]) => (
          <Button compactVisual key={value} type="button" size="sm" variant={filters.preset === value ? "secondary" : "ghost"} aria-pressed={filters.preset === value} onClick={() => onPreset(value)}>{label}</Button>
        ))}
        {activeFilters > 0 && <Badge>{activeFilters} filter aktif</Badge>}
        <span role="status" aria-live="polite" className="ml-auto text-xs font-semibold text-text-muted">
          {isUpdating ? "Memperbarui…" : hasUnappliedChanges ? "Perubahan belum diterapkan" : ""}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end">
        <Input label="Tanggal dari" error={error} inputProps={{ type: "date", value: filters.dateFrom, max: filters.dateTo, onChange: (event) => onChange({ dateFrom: event.target.value, preset: "custom" }) }} />
        <Input label="Tanggal sampai" inputProps={{ type: "date", value: filters.dateTo, min: filters.dateFrom, onChange: (event) => onChange({ dateTo: event.target.value, preset: "custom" }) }} />
        <SelectField label="Metode pembayaran" value={filters.paymentMethod} onChange={(paymentMethod) => onChange({ paymentMethod })} options={[{ value: "", label: "Semua metode" }, { value: "cash", label: "Tunai" }, { value: "qris", label: "QRIS" }]} />
        <SelectField label="Kasir" value={filters.cashierUserId} onChange={(cashierUserId) => onChange({ cashierUserId })} options={[{ value: "", label: "Semua kasir" }, ...cashierOptions.map((option) => ({ value: option.cashierUserId, label: option.label }))]} />
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button compactVisual type="submit" size="sm" variant="primary" disabled={!hasUnappliedChanges || isUpdating}>Terapkan</Button>
          <Button compactVisual type="button" size="sm" variant="ghost" onClick={onReset}>Reset</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button compactVisual type="button" size="sm" variant="secondary" aria-label="Ekspor ringkasan harian CSV" disabled={actionsDisabled || Boolean(exporting)} onClick={() => onExport("daily")}>{exporting === "daily" ? "Membuat CSV…" : "CSV harian"}</Button>
        <Button compactVisual type="button" size="sm" variant="secondary" aria-label="Ekspor detail transaksi CSV" disabled={actionsDisabled || Boolean(exporting)} onClick={() => onExport("transactions")}>{exporting === "transactions" ? "Membuat CSV…" : "CSV transaksi"}</Button>
        <Button compactVisual type="button" size="sm" variant="ghost" disabled={actionsDisabled} onClick={onHandoff}>Lihat transaksi</Button>
      </div>
      {refreshError && <p role="alert" className="rounded-card border border-warning/20 bg-warning-soft px-3 py-2 text-xs font-medium text-warning">{refreshError}</p>}
    </form>
  );
}
