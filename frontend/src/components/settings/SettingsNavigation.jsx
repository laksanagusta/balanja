import React from "react";

export default function SettingsNavigation({ items, activeId, onChange }) {
  return (
    <nav
      aria-label="Navigasi pengaturan"
      className="flex min-w-0 gap-1 overflow-x-auto pb-1 md:grid md:content-start md:overflow-visible md:pb-0"
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            data-href={item.href}
            aria-current={activeId === item.id ? "page" : undefined}
            className={`min-h-11 flex-none rounded-control border px-3 text-left text-sm font-semibold transition-[background-color,border-color,color] duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:w-full ${
              isActive
                ? "border-border bg-surface-muted text-text"
                : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
