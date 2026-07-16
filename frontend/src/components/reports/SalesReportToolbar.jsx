import React from "react";
import { Badge, Button, Input, SelectField } from "../primitives.jsx";

const presets = [
  ["today", "Hari ini"], ["7d", "7 hari"], ["30d", "30 hari"], ["month", "Bulan ini"], ["custom", "Rentang khusus"],
];

export default function SalesReportToolbar({ filters, cashierOptions = [], error = "", exporting = "", isUpdating = false, onChange, onPreset, onApply, onReset, onExport, onHandoff }) {
  const activeFilters = [filters.paymentMethod, filters.cashierUserId].filter(Boolean).length;
  return (
    <div className="grid gap-3 border-b border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map(([value, label]) => (
          <Button key={value} type="button" size="sm" variant={filters.preset === value ? "primary" : "secondary"} aria-pressed={filters.preset === value} onClick={() => onPreset(value)}>{label}</Button>
        ))}
        {activeFilters > 0 && <Badge>{activeFilters} filter aktif</Badge>}
        {isUpdating && <span role="status" aria-live="polite" className="ml-auto text-xs font-semibold text-text-muted">Memperbarui…</span>}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end">
        <Input label="Tanggal dari" error={error} inputProps={{ type: "date", value: filters.dateFrom, max: filters.dateTo, onChange: (event) => onChange({ dateFrom: event.target.value, preset: "custom" }) }} />
        <Input label="Tanggal sampai" inputProps={{ type: "date", value: filters.dateTo, min: filters.dateFrom, onChange: (event) => onChange({ dateTo: event.target.value, preset: "custom" }) }} />
        <SelectField label="Metode pembayaran" value={filters.paymentMethod} onChange={(paymentMethod) => onChange({ paymentMethod })} options={[{ value: "", label: "Semua metode" }, { value: "cash", label: "Tunai" }, { value: "qris", label: "QRIS" }]} />
        <SelectField label="Kasir" value={filters.cashierUserId} onChange={(cashierUserId) => onChange({ cashierUserId })} options={[{ value: "", label: "Semua kasir" }, ...cashierOptions.map((option) => ({ value: option.cashierUserId, label: option.label }))]} />
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button type="button" size="sm" variant="primary" onClick={onApply}>Terapkan</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onReset}>Reset</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" aria-label="Ekspor ringkasan harian CSV" disabled={Boolean(exporting)} onClick={() => onExport("daily")}>{exporting === "daily" ? "Membuat CSV…" : "CSV harian"}</Button>
        <Button type="button" size="sm" variant="secondary" aria-label="Ekspor detail transaksi CSV" disabled={Boolean(exporting)} onClick={() => onExport("transactions")}>{exporting === "transactions" ? "Membuat CSV…" : "CSV transaksi"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onHandoff}>Lihat transaksi</Button>
      </div>
    </div>
  );
}
