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
    scan: (
      <g transform="translate(1.5 3.3501)" strokeWidth="1.5">
        <path d="M21 9.4555H0" />
        <path d="M19.1299 5.245V3.732C19.1299 1.671 17.4589 0 15.3969 0H14.1919" />
        <path d="M1.8701 5.245V3.732C1.8701 1.671 3.5411 0 5.6031 0H6.8391" />
        <path d="M19.1299 9.4545V13.5285C19.1299 15.5905 17.4589 17.2615 15.3969 17.2615H14.1919" />
        <path d="M1.8701 9.4545V13.5285C1.8701 15.5905 3.5411 17.2615 5.6031 17.2615H6.8391" />
      </g>
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
    filter: (
      <>
        <path d="M4 5h16l-6.5 7.2V19l-3 1.5v-8.3z" />
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
      <path
        fill="currentColor"
        stroke="none"
        d="M12.2672 2.0005C12.9832 2.0005 13.6792 2.2945 14.1782 2.8055C14.6762 3.3195 14.9512 4.0245 14.9302 4.7395C14.9322 4.9005 14.9852 5.0865 15.0812 5.2495C15.2402 5.5195 15.4912 5.7095 15.7892 5.7875C16.0872 5.8615 16.3992 5.8215 16.6642 5.6645C17.9442 4.9335 19.5732 5.3715 20.3042 6.6415L20.9272 7.7205C20.9432 7.7495 20.9572 7.7775 20.9692 7.8065C21.6312 9.0575 21.1892 10.6325 19.9592 11.3515C19.7802 11.4545 19.6352 11.5985 19.5352 11.7725C19.3802 12.0415 19.3372 12.3615 19.4152 12.6555C19.4952 12.9555 19.6862 13.2045 19.9552 13.3585C20.5622 13.7075 21.0152 14.2955 21.1962 14.9745C21.3772 15.6525 21.2782 16.3885 20.9252 16.9955L20.2612 18.1015C19.5302 19.3575 17.9012 19.7925 16.6342 19.0605C16.4652 18.9635 16.2702 18.9105 16.0762 18.9055H16.0702C15.7812 18.9055 15.4842 19.0285 15.2682 19.2435C15.0492 19.4625 14.9292 19.7545 14.9312 20.0645C14.9242 21.5335 13.7292 22.7215 12.2672 22.7215H11.0142C9.5452 22.7215 8.3502 21.5275 8.3502 20.0585C8.3482 19.8775 8.2962 19.6895 8.1992 19.5265C8.0422 19.2525 7.7882 19.0565 7.4952 18.9785C7.2042 18.9005 6.8852 18.9435 6.6232 19.0955C5.9952 19.4455 5.2562 19.5305 4.5802 19.3405C3.9052 19.1495 3.3222 18.6855 2.9802 18.0705L2.3552 16.9935C1.6242 15.7255 2.0592 14.1005 3.3252 13.3685C3.6842 13.1615 3.9072 12.7755 3.9072 12.3615C3.9072 11.9475 3.6842 11.5605 3.3252 11.3535C2.0582 10.6175 1.6242 8.9885 2.3542 7.7205L3.0322 6.6075C3.7532 5.3535 5.3832 4.9115 6.6542 5.6415C6.8272 5.7445 7.0152 5.7965 7.2062 5.7985C7.8292 5.7985 8.3502 5.2845 8.3602 4.6525C8.3562 3.9555 8.6312 3.2865 9.1322 2.7815C9.6352 2.2775 10.3032 2.0005 11.0142 2.0005H12.2672ZM12.2672 3.5005H11.0142C10.7042 3.5005 10.4142 3.6215 10.1952 3.8395C9.9772 4.0585 9.8582 4.3495 9.8602 4.6595C9.8392 6.1215 8.6442 7.2985 7.1972 7.2985C6.7332 7.2935 6.2862 7.1685 5.8982 6.9365C5.3532 6.6265 4.6412 6.8175 4.3222 7.3725L3.6452 8.4855C3.3352 9.0235 3.5252 9.7345 4.0772 10.0555C4.8962 10.5295 5.4072 11.4135 5.4072 12.3615C5.4072 13.3095 4.8962 14.1925 4.0752 14.6675C3.5262 14.9855 3.3362 15.6925 3.6542 16.2425L4.2852 17.3305C4.4412 17.6115 4.6962 17.8145 4.9912 17.8975C5.2852 17.9795 5.6092 17.9445 5.8792 17.7945C6.2762 17.5615 6.7382 17.4405 7.2022 17.4405C7.4312 17.4405 7.6602 17.4695 7.8842 17.5295C8.5602 17.7115 9.1472 18.1635 9.4952 18.7705C9.7212 19.1515 9.8462 19.5965 9.8502 20.0505C9.8502 20.7005 10.3722 21.2215 11.0142 21.2215H12.2672C12.9062 21.2215 13.4282 20.7035 13.4312 20.0645C13.4272 19.3585 13.7032 18.6875 14.2082 18.1825C14.7062 17.6845 15.4022 17.3855 16.0982 17.4055C16.5542 17.4165 16.9932 17.5395 17.3802 17.7595C17.9372 18.0785 18.6482 17.8885 18.9702 17.3385L19.6342 16.2315C19.7822 15.9765 19.8252 15.6565 19.7462 15.3615C19.6682 15.0665 19.4722 14.8105 19.2082 14.6595C18.5902 14.3035 18.1492 13.7295 17.9662 13.0415C17.7852 12.3665 17.8842 11.6295 18.2372 11.0225C18.4672 10.6225 18.8042 10.2855 19.2082 10.0535C19.7502 9.7365 19.9402 9.0275 19.6252 8.4755C19.6122 8.4535 19.6002 8.4305 19.5902 8.4065L19.0042 7.3905C18.6852 6.8355 17.9752 6.6445 17.4182 6.9615C16.8162 7.3175 16.1002 7.4195 15.4122 7.2385C14.7252 7.0605 14.1492 6.6255 13.7902 6.0115C13.5602 5.6275 13.4352 5.1805 13.4312 4.7255C13.4402 4.3835 13.3202 4.0765 13.1022 3.8515C12.8852 3.6275 12.5802 3.5005 12.2672 3.5005ZM11.6451 8.9746C13.5121 8.9746 15.0311 10.4946 15.0311 12.3616C15.0311 14.2286 13.5121 15.7466 11.6451 15.7466C9.7781 15.7466 8.2591 14.2286 8.2591 12.3616C8.2591 10.4946 9.7781 8.9746 11.6451 8.9746ZM11.6451 10.4746C10.6051 10.4746 9.7591 11.3216 9.7591 12.3616C9.7591 13.4016 10.6051 14.2466 11.6451 14.2466C12.6851 14.2466 13.5311 13.4016 13.5311 12.3616C13.5311 11.3216 12.6851 10.4746 11.6451 10.4746Z"
      />
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
      "scan-3d bg-accent text-white hover:bg-accent-hover",
    secondary:
      "border border-border bg-surface text-text shadow-low hover:bg-surface-muted",
    ghost: "text-text-muted hover:bg-surface-muted hover:text-text",
    danger:
      "bg-danger-soft text-danger hover:bg-danger-soft/80 border border-transparent",
  };

  const sizes = {
    xs: "h-6 gap-1 rounded-control px-2 text-xs",
    sm: "h-8 gap-1.5 rounded-control px-2.5 text-sm",
    base: "h-9 gap-2 rounded-control px-3.5 text-sm",
    md: "h-9 gap-2 rounded-control px-3.5 text-sm",
    lg: "h-11 gap-2.5 rounded-control px-5 text-lg",
    xl: "h-13 gap-3 rounded-control px-6 text-xl",
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-[transform,background-color,border-color,color] duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, placeholder, rightSlot, error, className = "", inputProps = {} }) {
  return (
    <label className={`grid min-w-0 gap-2 text-sm font-semibold text-text ${className}`}>
      {label}
      <span
        className={`flex h-9 w-full min-w-0 items-center gap-3 rounded-card border bg-surface px-3.5 text-text-muted shadow-inner-soft focus-within:outline-2 focus-within:outline-focus/30 ${
          error ? "border-danger focus-within:border-danger" : "border-border focus-within:border-border-strong"
        }`}
      >
        <input
          className="w-full min-w-0 flex-1 bg-transparent text-sm font-medium text-text outline-none placeholder:text-text-subtle"
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          {...inputProps}
        />
        {rightSlot}
      </span>
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
    </label>
  );
}

export function SelectField({ label, value, options = [], onChange, error, inline = false, hideLabel = false, disabled = false }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(value);
  const menuOptions = options.length > 0 ? options : [value];
  const selectedValue = onChange ? value : selected;
  const getOptionValue = (option) => (typeof option === "object" && option !== null ? option.value : option);
  const getOptionLabel = (option) => (typeof option === "object" && option !== null ? option.label : option);
  const selectedLabel = getOptionLabel(menuOptions.find((option) => getOptionValue(option) === selectedValue) ?? selectedValue);

  return (
    <div className="relative grid gap-2 text-sm font-semibold text-text">
      <span className={hideLabel ? "sr-only" : ""}>{label}</span>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-9 items-center justify-between rounded-card border bg-surface px-3.5 text-left text-sm font-medium text-text-muted shadow-inner-soft transition duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45 ${
          error ? "border-danger" : isOpen ? "border-border-strong ring-4 ring-accent-soft" : "border-border"
        }`}
      >
        {selectedLabel}
        <Icon
          name="chevron"
          className={`size-4 transition duration-base ease-standard motion-reduce:transition-none ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      {inline ? (
        isOpen && (
          <div className="grid gap-1 rounded-card border border-border bg-surface-muted p-1">
            {menuOptions.map((option) => {
              const optionValue = getOptionValue(option);
              const optionLabel = getOptionLabel(option);
              return (
              <button
                key={optionValue}
                type="button"
                onClick={() => {
                  if (onChange) onChange(optionValue);
                  else setSelected(optionValue);
                  setIsOpen(false);
                }}
                className={`flex h-10 w-full items-center rounded-control px-3 text-left text-sm font-medium transition duration-fast ease-standard hover:bg-surface ${
                  selectedValue === optionValue ? "bg-surface text-text shadow-low" : "text-text-muted"
                }`}
              >
                {optionLabel}
              </button>
              );
            })}
          </div>
        )
      ) : (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+8px)] z-20 origin-top overflow-hidden rounded-card border border-border bg-surface p-1 shadow-panel transition-[opacity,transform] duration-base ease-standard motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:transition-opacity motion-reduce:duration-200 ${
            isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0"
          }`}
        >
          {menuOptions.map((option) => {
            const optionValue = getOptionValue(option);
            const optionLabel = getOptionLabel(option);
            return (
            <button
              key={optionValue}
              type="button"
              onClick={() => {
                if (onChange) onChange(optionValue);
                else setSelected(optionValue);
                setIsOpen(false);
              }}
              className={`flex h-10 w-full items-center rounded-control px-3 text-left text-sm font-medium transition duration-fast ease-standard hover:bg-surface-muted ${
                selectedValue === optionValue ? "bg-surface-muted text-text" : "text-text-muted"
              }`}
            >
              {optionLabel}
            </button>
            );
          })}
        </div>
      )}
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "border-border bg-surface-muted text-text-muted",
    success: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/20 bg-warning-soft text-warning",
    danger: "border-danger/20 bg-danger-soft text-danger",
    accent: "border-accent/20 bg-accent-soft text-accent",
  };

  return (
    <span
      className={`inline-flex h-7 items-center rounded-control border px-3 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Pill({ children, tone = "neutral", selected = false, className = "", ...props }) {
  const tones = {
    neutral: selected
      ? "border-accent bg-surface text-text shadow-low"
      : "border-border bg-surface-muted text-text-muted hover:bg-surface hover:text-text",
    accent: selected
      ? "border-accent bg-accent text-white shadow-accent"
      : "border-accent/20 bg-accent-soft text-accent hover:bg-accent-soft/70",
    success: "border-success/20 bg-success-soft text-success hover:bg-success-soft/70",
    warning: "border-warning/20 bg-warning-soft text-warning hover:bg-warning-soft/70",
    danger: "border-danger/20 bg-danger-soft text-danger hover:bg-danger-soft/70",
  };

  return (
    <button
      type="button"
      className={`inline-flex h-8 min-w-fit items-center justify-center rounded-full border px-3 text-sm font-medium transition duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-panel border border-border bg-surface shadow-panel ${className}`}>
      {children}
    </section>
  );
}

export function DataTable({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  className = "",
}) {
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={col.sortable && sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  className={`h-11 whitespace-nowrap px-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(col.key)}
                      className={`inline-flex h-8 w-full items-center gap-1.5 rounded-control px-1.5 font-semibold uppercase tracking-[0.08em] transition-[background-color,color,transform] duration-fast ease-standard hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] ${
                        sortKey === col.key ? "text-text" : "text-text-subtle"
                      } ${col.align === "right" ? "justify-end" : "justify-start"}`}
                    >
                      <span>{col.label}</span>
                      <Icon
                        name="chevron"
                        className={`size-3.5 shrink-0 transition-transform duration-base ease-standard motion-reduce:transition-none ${
                          sortKey === col.key
                            ? sortDir === "asc"
                              ? "rotate-180 text-accent"
                              : "rotate-0 text-accent"
                            : "rotate-0 text-text-subtle opacity-45"
                        }`}
                      />
                    </button>
                  ) : (
                    <span
                      className={`inline-flex h-8 w-full items-center px-1.5 ${
                        col.align === "right" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {col.label}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={`border-b border-border transition last:border-b-0 hover:bg-surface-muted/60 ${
                  i % 2 === 1 ? "bg-surface-muted/30" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`h-11 px-3 text-text ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

export function useDialogPresence(open, duration = 200) {
  const [isPresent, setIsPresent] = React.useState(open);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setIsPresent(true);
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timeout = window.setTimeout(() => setIsPresent(false), duration);
    return () => window.clearTimeout(timeout);
  }, [open, duration]);

  return { isPresent, isVisible };
}

export function Dialog({ open, onClose, size = "md", title, icon, iconBg, children, footer }) {
  const { isPresent, isVisible } = useDialogPresence(open);
  const titleId = React.useId();
  const dialogRef = React.useRef(null);
  const snap = React.useRef({ children, title, icon, iconBg, footer });
  if (open) snap.current = { children, title, icon, iconBg, footer };

  React.useEffect(() => {
    if (!isVisible) return undefined;
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    return () => previousFocus?.focus?.();
  }, [isVisible]);

  React.useEffect(() => {
    if (!isVisible) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape" && onClose) onClose();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, onClose]);

  if (!isPresent) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  const c = snap.current;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ease-standard motion-reduce:transition-opacity ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isVisible}
    >
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={c.title ? titleId : undefined}
        tabIndex={-1}
        className={`relative max-h-[calc(100svh-2rem)] w-full overflow-y-auto ${sizes[size]} rounded-panel border border-border bg-surface p-6 shadow-panel transition-[opacity,transform] duration-200 ease-standard motion-reduce:scale-100 motion-reduce:transition-opacity ${
          isVisible ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
        } ${
          !c.footer && !c.icon ? "text-center" : ""
        }`}
      >
        {c.icon && (
          <div className={`mb-4 mx-auto flex size-12 items-center justify-center rounded-full ${c.iconBg || "bg-accent-soft text-accent"}`}>
            <Icon name={c.icon} className="size-6" />
          </div>
        )}
        {c.title && (
          <div className="mb-2 flex items-center justify-between">
            <h4 id={titleId} className="text-lg font-semibold text-text">{c.title}</h4>
            {onClose && (
              <button type="button" onClick={onClose} className="text-text-muted hover:text-text">
                <Icon name="x" className="size-5" />
              </button>
            )}
          </div>
        )}
        {c.children && <div className="text-sm text-text-muted">{c.children}</div>}
        {c.footer && <div className="mt-6 flex justify-end gap-2">{c.footer}</div>}
      </div>
    </div>
  );
}

export function Switch({ checked = false, tone = "accent" }) {
  const activeTone = tone === "success" ? "bg-success" : "bg-accent";

  return (
    <span
      className={`inline-flex h-5 w-9 items-center rounded-full border border-border p-0.5 transition ${
        checked ? activeTone : "bg-surface-muted"
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
