import React from "react";

export function Icon({ name, className = "size-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const paths = {
    grid: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
    sidebar: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M10 4v16M15 9l-3 3 3 3" />
      </>
    ),
    home: (
      <>
        <path d="m3.5 11 8.5-7 8.5 7" />
        <path d="M6 10.5V20h12v-9.5" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    bag: (
      <>
        <path d="M6.5 8.5h11L16.5 21h-9z" />
        <path d="M9 8.5a3 3 0 0 1 6 0" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
    table: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M4 10h16M9 5v14M15 5v14" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
    package: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
    barcode: (
      <>
        <path d="M4 5v14M8 5v14M12 5v14M17 5v14M20 5v14" />
        <path d="M6 5v14M14 5v14" strokeWidth="1" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    users: (
      <>
        <path d="M16 19a4 4 0 0 0-8 0" />
        <circle cx="12" cy="8" r="3" />
        <path d="M20 18a3.5 3.5 0 0 0-3-3.4M4 18a3.5 3.5 0 0 1 3-3.4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7.5 7.5 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7.5 7.5 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.7h4.4l.4-2.7a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
      </>
    ),
    moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.4 2.4 0 1 1 3.7 2c-.9.6-1.5 1.1-1.5 2.2" />
        <path d="M12 17h.01" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    file: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5M9.5 13h5M9.5 17h5" />
      </>
    ),
    cash: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 10v4M18 10v4" />
      </>
    ),
    x: <path d="M18 6 6 18M6 6l12 12" />,
    check: <path d="m8 13 3 3 6-7" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>,
    printer: <><path d="M7 11V4h10v7" /><rect x="5" y="13" width="14" height="6" rx="1.5" /><path d="M7 17h10" /></>,
    qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 14h2v6h-2zM14 18v2h6v-2z" /></>,
    ticket: <><path d="M3 8.5v7a2.5 2.5 0 0 0 0 5h18a2.5 2.5 0 0 0 0-5v-7a2.5 2.5 0 0 0 0-5H3a2.5 2.5 0 0 0 0 5Z" /><path d="M12 8v8" /></>,
    loader: (
      <>
        <path d="M12 3a9 9 0 0 1 9 9" strokeDasharray="60" strokeDashoffset="20">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
        </path>
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

export function Button({ children, variant = "secondary", size = "md", className = "", ...props }) {
  const variants = {
    primary:
      "bg-accent text-white shadow-accent hover:bg-accent-hover",
    secondary:
      "border border-border bg-surface text-text shadow-low hover:bg-surface-muted",
    ghost: "text-text-muted hover:bg-surface-muted hover:text-text",
    danger:
      "bg-danger-soft text-danger hover:bg-danger-soft/80 border border-transparent",
  };

  const sizes = {
    sm: "h-8 gap-1.5 rounded-md px-2.5 text-xs",
    md: "h-11 gap-2 rounded-control px-4 text-sm",
    lg: "h-13 gap-3 rounded-xl px-6 text-base",
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, placeholder, rightSlot, className = "", inputProps = {} }) {
  return (
    <label className={`grid gap-2 text-sm font-semibold text-text ${className}`}>
      {label}
      <span className="flex h-[42px] items-center gap-3 rounded-control border border-border bg-surface px-4 text-text-muted shadow-inner-soft focus-within:border-border-strong focus-within:outline-2 focus-within:outline-focus/30">
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text outline-none placeholder:text-text-subtle"
          placeholder={placeholder}
          {...inputProps}
        />
        {rightSlot}
      </span>
    </label>
  );
}

export function SelectField({ label, value, options = [] }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(value);
  const menuOptions = options.length > 0 ? options : [value];

  return (
    <div className="relative grid gap-2 text-sm font-semibold text-text">
      <span>{label}</span>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-[42px] items-center justify-between rounded-control border bg-surface px-4 text-left text-sm font-medium text-text-muted shadow-inner-soft transition duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
          isOpen ? "border-border-strong ring-4 ring-accent-soft" : "border-border"
        }`}
      >
        {selected}
        <Icon
          name="chevron"
          className={`size-4 transition duration-base ease-standard motion-reduce:transition-none ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      <div
        className={`absolute left-0 right-0 top-[calc(100%+8px)] z-20 origin-top overflow-hidden rounded-control border border-border bg-surface p-1 shadow-panel transition duration-base ease-standard motion-reduce:transition-none ${
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0"
        }`}
      >
        {menuOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setSelected(option);
              setIsOpen(false);
            }}
            className={`flex h-10 w-full items-center rounded-md px-3 text-left text-sm font-medium transition duration-fast ease-standard hover:bg-surface-muted ${
              selected === option ? "bg-surface-muted text-text" : "text-text-muted"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-border bg-surface-muted text-text-muted",
    success: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/20 bg-warning-soft text-warning",
    danger: "border-danger/20 bg-danger-soft text-danger",
    accent: "border-accent/20 bg-accent-soft text-accent",
  };

  return (
    <span
      className={`inline-flex h-7 items-center rounded-md border px-3 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-panel border border-border bg-surface shadow-panel ${className}`}>
      {children}
    </section>
  );
}

export function DataTable({ columns, data, sortKey, sortDir, onSort, className = "" }) {
  return (
    <div className={`w-full overflow-auto ${className}`}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`h-10 whitespace-nowrap px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle ${
                  col.sortable ? "cursor-pointer select-none hover:text-text" : ""
                }`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="text-accent">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              className={`border-b border-border transition hover:bg-surface-muted/60 ${
                i % 2 === 1 ? "bg-surface-muted/30" : ""
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="h-11 px-3 text-text">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-surface-muted ${className}`} />;
}

export function Toast({ variant = "success", message, onDismiss }) {
  const styles = {
    success: "border-success/20 bg-success-soft text-success",
    error: "border-danger/20 bg-danger-soft text-danger",
    warning: "border-warning/20 bg-warning-soft text-warning",
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-card border px-4 py-3 text-sm font-semibold shadow-panel ${styles[variant]}`}
      role="alert"
    >
      {variant === "success" && <Icon name="check" className="size-4" />}
      {variant === "error" && <Icon name="x" className="size-4" />}
      {variant === "warning" && <Icon name="help" className="size-4" />}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100">
          <Icon name="x" className="size-4" />
        </button>
      )}
    </div>
  );
}

export function Dialog({ open, onClose, size = "md", title, icon, iconBg, children, footer }) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${sizes[size]} rounded-panel border border-border bg-surface p-6 shadow-panel ${
          !footer && !icon ? "text-center" : ""
        }`}
      >
        {icon && (
          <div className={`mb-4 mx-auto flex size-12 items-center justify-center rounded-full ${iconBg || "bg-accent-soft text-accent"}`}>
            <Icon name={icon} className="size-6" />
          </div>
        )}
        {title && (
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-text">{title}</h4>
            {onClose && (
              <button onClick={onClose} className="text-text-muted hover:text-text">
                <Icon name="x" className="size-5" />
              </button>
            )}
          </div>
        )}
        {children && <div className="text-sm text-text-muted">{children}</div>}
        {footer && <div className="mt-6 flex justify-center gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Switch({ checked = false }) {
  return (
    <span
      className={`inline-flex h-5 w-9 items-center rounded-full border border-border p-0.5 transition ${
        checked ? "bg-accent" : "bg-surface-muted"
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`size-4 rounded-full bg-white shadow-low transition ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </span>
  );
}
