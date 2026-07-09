import React from "react";

const styles = [
  {
    label: "Display",
    sample: "Balanja POS",
    className: "text-3xl font-bold",
    note: "Manrope 700 / 30px",
  },
  {
    label: "Heading",
    sample: "Order Summary",
    className: "text-2xl font-semibold",
    note: "Manrope 600 / 24px",
  },
  {
    label: "Body",
    sample: "Gunakan akses shift untuk membuka layar point of sale.",
    className: "text-base font-medium leading-relaxed",
    note: "Manrope 500 / 16px",
  },
  {
    label: "Value (Mono)",
    sample: "$ 30.98",
    className: "text-lg font-semibold",
    note: "JetBrains Mono 600 / 18px",
    mono: true,
  },
];

export default function TypographyPanel() {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Typography</h3>
      <div className="overflow-hidden rounded-panel border border-border">
        {styles.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-baseline gap-4 px-4 py-3 ${
              i < styles.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-[0.1em] text-text-subtle">
              {s.label}
            </span>
            <p
              className={`flex-1 text-text ${s.className}`}
              style={{
                fontFamily: s.mono ? "var(--font-mono)" : "var(--font-sans)",
                fontVariantNumeric: s.mono ? "tabular-nums" : undefined,
              }}
            >
              {s.sample}
            </p>
            <span className="hidden shrink-0 font-mono text-xs text-text-muted sm:block">{s.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
