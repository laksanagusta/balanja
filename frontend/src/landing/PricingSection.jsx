import React from "react";
import { Button, FloatingPopover, Icon } from "../components/primitives.jsx";
import { ScrollReveal } from "./ScrollReveal.jsx";

export const pricingFeatures = [
  "Kasir dan checkout",
  "Katalog produk",
  "Pencatatan stok",
  "Riwayat transaksi dan laporan",
  "Pemindaian barcode",
];

export function PricingPanel({ onStart, contacts = null, showcase = false }) {
  const [contactOpen, setContactOpen] = React.useState(false);
  const triggerRef = React.useRef(null);
  const popoverRef = React.useRef(null);
  const contactPopoverId = React.useId();
  const hasContactChannel = Boolean(contacts?.whatsapp || contacts?.email);
  const canStart = Boolean(onStart || hasContactChannel);

  React.useEffect(() => {
    if (!contactOpen) return undefined;

    function handlePointerDown(event) {
      if (triggerRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      setContactOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setContactOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contactOpen]);

  function handleStart() {
    if (!canStart) return;
    if (!hasContactChannel) {
      onStart?.();
      return;
    }
    setContactOpen((open) => !open);
    onStart?.();
  }

  return (
    <div className={`grid gap-10 rounded-panel bg-text px-6 py-8 text-white sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:p-12 ${showcase ? "max-w-5xl" : ""}`}>
      <div className="flex flex-col justify-between gap-8">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[0.14em] text-white/60">Paket Wipay</p>
          <h2 id="pricing-title" className="mt-4 max-w-xl text-balance text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">Satu paket Pro untuk toko yang terus berjalan.</h2>
          <p className="mt-5 max-w-lg text-base leading-[1.6] text-white/70">Semua alur penting toko dalam satu paket yang jelas—dari melayani pembeli sampai memantau stok dan transaksi.</p>
        </div>
        <span className="w-fit rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80">Hanya satu pilihan</span>
      </div>

      <div className="border-t border-white/15 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold">Pro</p>
            <p className="mt-2 text-2xl font-semibold text-white">Rp99.000<span className="ml-1 text-sm font-medium text-white/65">/bulan</span></p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-text">Rekomendasi</span>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {pricingFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-white/80">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-white"><Icon name="check" className="size-3" /></span>
              {feature}
            </li>
          ))}
        </ul>
        <div ref={triggerRef} className="relative mt-8">
          {canStart ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleStart}
              aria-expanded={hasContactChannel ? contactOpen : undefined}
              aria-controls={hasContactChannel ? contactPopoverId : undefined}
              className="w-full"
            >
              Mulai dengan Pro
            </Button>
          ) : (
            <p role="status" className="rounded-button bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white/80">Kontak upgrade belum tersedia.</p>
          )}
          <FloatingPopover
            ref={popoverRef}
            anchorRef={triggerRef}
            open={hasContactChannel && contactOpen}
            align="end"
            matchAnchorWidth={false}
            className="w-[min(20rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-4 text-text shadow-panel"
          >
            <div id={contactPopoverId} role="dialog" aria-label="Kontak Wipay untuk paket Pro">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Hubungi Wipay</p>
                  <p className="mt-1 text-xs leading-5 text-text-muted">Pilih kanal untuk mengaktifkan paket Pro.</p>
                </div>
                <button type="button" aria-label="Tutup pilihan kontak" onClick={() => setContactOpen(false)} className="grid size-11 shrink-0 place-items-center rounded-control text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">×</button>
              </div>
              <div className="mt-4 grid gap-2">
                {contacts?.whatsapp ? (
                  <a href={contacts.whatsapp} target="_blank" rel="noreferrer" onClick={() => setContactOpen(false)} className="flex min-h-11 items-center justify-between rounded-control bg-text px-3 text-sm font-semibold text-white hover:bg-text/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                    WhatsApp <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
                {contacts?.email ? (
                  <a href={contacts.email} onClick={() => setContactOpen(false)} className="flex min-h-11 items-center justify-between rounded-control border border-border bg-surface px-3 text-sm font-semibold text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                    Email <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
              </div>
            </div>
          </FloatingPopover>
        </div>
      </div>
    </div>
  );
}

export default function PricingSection({ onStart, contacts }) {
  return (
    <section id="harga" className="scroll-mt-24 bg-app-bg px-4 py-20 sm:px-6 sm:py-28 lg:py-36" aria-labelledby="pricing-title">
      <ScrollReveal className="mx-auto max-w-6xl">
        <PricingPanel onStart={onStart} contacts={contacts} />
      </ScrollReveal>
    </section>
  );
}
