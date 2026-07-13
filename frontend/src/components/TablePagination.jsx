import React from "react";
import { Icon } from "./primitives.jsx";

export function TablePagination({
  start,
  end,
  page,
  pageSize,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = [20, 50, 100],
}) {
  const rangeLabel = start === 0 ? "Showing 0" : `Showing ${start}-${end}`;

  return (
    <div className="flex min-h-14 flex-col gap-3 border-t border-border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium text-text-muted">
          {rangeLabel}
        </p>
        <label className="flex h-9 items-center gap-2 rounded-control border border-border bg-surface px-2.5 text-xs font-semibold text-text-muted shadow-inner-soft">
          Rows
          <select
            value={pageSize}
            disabled={loading}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="bg-transparent font-mono text-xs font-semibold text-text outline-none disabled:opacity-45"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          disabled={loading || !canPrevious}
          onClick={onPrevious}
          className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-semibold text-text-muted shadow-low transition-[background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-40"
        >
          <Icon name="chevron" className="size-3.5 rotate-90" />
          Previous
        </button>
        <span className="min-w-16 text-center font-mono text-xs font-semibold tabular-nums text-text-muted">
          Page {page}
        </span>
        <button
          type="button"
          disabled={loading || !canNext}
          onClick={onNext}
          className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-semibold text-text-muted shadow-low transition-[background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-40"
        >
          Next
          <Icon name="chevron" className="size-3.5 -rotate-90" />
        </button>
      </div>
    </div>
  );
}
