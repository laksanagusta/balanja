import React from "react";
import { Button } from "../primitives.jsx";
import PosProductMockup from "../../landing/PosProductMockup.jsx";

export default function MarketingPatternsShowcase() {
  return (
    <section className="overflow-hidden rounded-panel border border-border bg-surface shadow-low">
      <div className="border-b border-border p-4 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-success">Marketing page patterns</p>
        <h3 className="mt-3 text-2xl font-semibold text-text">Public display, CTA, and product frame</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
          These spacious patterns are reserved for the public landing page. Operational screens keep their compact title and control scales.
        </p>
      </div>

      <div className="grid gap-6 p-4 sm:p-6">
        <div className="grid gap-6 rounded-panel bg-app-bg p-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">POS untuk UMKM Indonesia</p>
            <p className="mt-4 max-w-4xl text-[42px] font-semibold leading-[0.98] tracking-[-0.055em] text-text sm:text-[56px] lg:text-[72px]">
              Satu tempat untuk jualan, <span className="text-text-subtle">stok, dan transaksi.</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="lg">Primary CTA</Button>
            <Button size="lg">Secondary CTA</Button>
            <Button variant="primary" size="sm" compactVisual className="header-compact-action">Masuk</Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-panel pt-10 sm:pt-14">
          <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/landing/hero-ascii-magic-5.png')" }} />
          <div aria-hidden="true" className="absolute inset-0 bg-accent/20" />
          <div className="relative px-3 sm:px-10 lg:px-20">
            <div className="rounded-t-panel bg-white/25 px-2 pt-2 backdrop-blur-xl">
              <PosProductMockup compact />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-panel border border-border p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-subtle">Section spacing</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[["Mobile", "80px"], ["Tablet", "112px"], ["Desktop", "144px"]].map(([label, value]) => (
                <div key={label} className="rounded-card bg-surface-muted p-3">
                  <p className="text-xs text-text-muted">{label}</p>
                  <p className="mt-2 font-mono text-sm font-semibold text-text">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-panel border border-border px-4">
            <button type="button" className="press-feedback flex min-h-16 w-full items-center justify-between gap-4 border-b border-border py-4 text-left text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
              Closed FAQ row
              <span aria-hidden="true" className="faq-toggle-icon text-text-muted" />
            </button>
            <div className="py-4">
              <div className="flex items-center justify-between gap-4 text-sm font-semibold text-text">
                Open FAQ row
                <span aria-hidden="true" className="faq-toggle-icon is-open text-text-muted" />
              </div>
              <p className="mt-3 text-sm leading-6 text-text-muted">Answers expand beneath a divider-only row without an outer accordion card.</p>
            </div>
          </div>
        </div>

        <p className="rounded-card border border-border bg-surface-muted p-4 text-sm leading-6 text-text-muted">
          Public controls use a minimum 44px touch target, visible keyboard focus, and immediate press feedback. A compact 32px header action keeps a transparent 44px hit area. FAQ answers remain mounted and use the morphing indicator above. Smooth scrolling becomes immediate for reduced motion; translucent chrome becomes solid for reduced transparency or increased contrast.
        </p>
      </div>
    </section>
  );
}
