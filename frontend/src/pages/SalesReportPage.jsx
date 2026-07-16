import React from "react";
import { toast } from "sonner";
import ReportMetricCard from "../components/reports/ReportMetricCard.jsx";
import SalesTrendPanel from "../components/reports/SalesTrendPanel.jsx";
import ReportBreakdownPanels, { VoidReportPanel } from "../components/reports/ReportBreakdownPanels.jsx";
import SalesReportToolbar from "../components/reports/SalesReportToolbar.jsx";
import { SalesReportPageSkeleton } from "../components/page-loading.jsx";
import { Button } from "../components/primitives.jsx";
import { EmptyState } from "../components/feedback/EmptyState.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { formatPrice } from "../shared.jsx";
import { defaultReportFilters, downloadBlob, presetRange, transactionHandoff, validateCustomRange } from "../reports/report-utils.js";

const formatCount = (value) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(Number(value) || 0);

export default function SalesReportPage({ onNavigate }) {
  const { api } = usePOSStore();
  const initial = React.useMemo(() => defaultReportFilters(), []);
  const [filters, setFilters] = React.useState(initial);
  const [appliedFilters, setAppliedFilters] = React.useState(initial);
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [rangeError, setRangeError] = React.useState("");
  const [exporting, setExporting] = React.useState("");
  const [retryKey, setRetryKey] = React.useState(0);
  const hasReport = React.useRef(false);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api.getSalesReport({ ...appliedFilters, signal: controller.signal })
      .then((value) => {
        hasReport.current = true;
        setReport(value);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        if (hasReport.current) toast.error("Laporan gagal diperbarui");
        else setError(requestError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, appliedFilters, retryKey]);

  const updateFilters = React.useCallback((changes) => setFilters((current) => ({ ...current, ...changes })), []);
  const applyPreset = React.useCallback((preset) => {
    if (preset === "custom") {
      setFilters((current) => ({ ...current, preset }));
      return;
    }
    const next = { ...filters, preset, ...presetRange(preset) };
    setRangeError("");
    setFilters(next);
    setAppliedFilters(next);
  }, [filters]);
  const apply = React.useCallback(() => {
    const validation = validateCustomRange(filters.dateFrom, filters.dateTo);
    setRangeError(validation.error);
    if (validation.valid) setAppliedFilters({ ...filters });
  }, [filters]);
  const reset = React.useCallback(() => {
    const next = defaultReportFilters();
    setRangeError("");
    setFilters(next);
    setAppliedFilters(next);
  }, []);
  const exportCSV = React.useCallback(async (kind) => {
    setExporting(kind);
    try {
      const file = await api.downloadSalesReport(appliedFilters, kind);
      downloadBlob(file);
      toast.success("CSV berhasil dibuat");
    } catch {
      toast.error("CSV gagal dibuat");
    } finally {
      setExporting("");
    }
  }, [api, appliedFilters]);

  if (!report && loading) return <SalesReportPageSkeleton />;
  if (!report && error) {
    return <EmptyState icon="file" title="Laporan gagal dimuat" description={error.message || "Coba muat kembali laporan penjualan."} action={<Button onClick={() => setRetryKey((value) => value + 1)}>Coba lagi</Button>} className="m-4 min-h-[360px]" />;
  }

  const metrics = report?.metrics || {};
  const comparisons = report?.comparisons || {};
  const cards = [
    ["Penjualan bersih", formatPrice(metrics.netSales), "netSales", formatPrice],
    ["Pajak", formatPrice(metrics.tax), "tax", formatPrice],
    ["Total diterima", formatPrice(metrics.totalReceived), "totalReceived", formatPrice],
    ["Transaksi selesai", formatCount(metrics.completedTransactions), "completedTransactions", formatCount],
    ["Item terjual", formatCount(metrics.itemsSold), "itemsSold", formatCount],
    ["Rata-rata transaksi", formatPrice(metrics.averageTransaction), "averageTransaction", formatPrice],
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-app-bg">
      <header className="border-b border-border bg-surface px-4 py-3">
        <h1 className="text-base font-semibold text-text">Laporan Penjualan</h1>
        <p className="mt-1 text-xs text-text-muted">Analisis transaksi selesai dan void berdasarkan kalender WIB.</p>
      </header>
      <SalesReportToolbar
        filters={filters}
        cashierOptions={report?.cashierOptions || []}
        error={rangeError}
        exporting={exporting}
        isUpdating={loading && Boolean(report)}
        onChange={updateFilters}
        onPreset={applyPreset}
        onApply={apply}
        onReset={reset}
        onExport={exportCSV}
        onHandoff={() => onNavigate(transactionHandoff(appliedFilters))}
      />
      <main className={`min-h-0 flex-1 overflow-auto p-4 transition-opacity duration-base ease-standard motion-reduce:transition-none ${loading ? "opacity-60" : "opacity-100"}`} aria-busy={loading}>
        <div className="grid gap-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Metrik laporan penjualan">
            {cards.map(([label, value, key, formatter]) => <ReportMetricCard key={key} label={label} value={value} comparison={comparisons[key]} formatAbsolute={formatter} />)}
          </section>
          <VoidReportPanel voids={report?.voids} formatMoney={formatPrice} formatCount={formatCount} />
          <SalesTrendPanel current={report?.trend} previous={report?.comparisonTrend} />
          <ReportBreakdownPanels
            products={report?.topProducts}
            payments={report?.paymentMethods}
            cashiers={report?.cashiers}
            voids={report?.voids}
            showVoids={false}
            formatMoney={formatPrice}
            formatCount={formatCount}
          />
        </div>
      </main>
    </div>
  );
}
