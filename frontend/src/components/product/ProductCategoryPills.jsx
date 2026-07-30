import React from "react";

export function ProductCategoryPills({
  value,
  options,
  onChange,
  label = "Filter kategori produk",
}) {
  return (
    <div
      className="-mx-1 overflow-x-auto px-1"
      role="group"
      aria-label={label}
    >
      <div className="flex min-w-max gap-1">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value || "all"}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className="group grid min-h-11 shrink-0 place-items-center px-0.5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
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
    </div>
  );
}
