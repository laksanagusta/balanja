import React from "react";
import { Logo } from "../../shared.jsx";

export default function BrandPatternsShowcase() {
  return (
    <section className="rounded-panel border border-border bg-surface p-4 shadow-low">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Brand identity</p>
      <h3 className="mt-2 text-xl font-semibold text-text">Balanja brand mark</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
        Preserve the supplied mark&apos;s original aspect ratio, dark fill, transparent background, and rounded
        geometry. Use it only on light surfaces; do not crop, recolor, stretch, outline, or place it inside another
        container.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid min-h-28 content-center gap-3 rounded-card border border-border bg-surface px-5 py-4">
          <Logo className="h-12" />
          <span className="text-xs text-text-muted">Primary mark · original 65:31 ratio</span>
        </div>
        <div className="grid min-h-28 content-center gap-3 rounded-card border border-border bg-surface-muted px-5 py-4">
          <Logo />
          <span className="text-xs text-text-muted">Navigation mark · 28px high</span>
        </div>
      </div>
    </section>
  );
}
