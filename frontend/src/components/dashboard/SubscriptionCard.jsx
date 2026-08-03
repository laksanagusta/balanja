import React from "react";
import { Drawer } from "vaul";
import { Icon, useOverlayDepth } from "../primitives.jsx";

const proFeatures = [
  "Kasir dan checkout",
  "Katalog dan stok",
  "Riwayat transaksi",
  "Laporan dan barcode",
];

export default function SubscriptionCard({ entitlement, contacts = null, preview = false }) {
  const [open, setOpen] = React.useState(false);
  const isVisible = preview || (entitlement && entitlement.status !== "paid_active");
  const used = entitlement?.transactionsUsed ?? 0;
  const limit = entitlement?.transactionLimit ?? 50;
  const remaining = entitlement?.remaining ?? Math.max(0, limit - used);

  useOverlayDepth(open);

  if (!isVisible) return null;

  return (
    <section aria-label="Langganan Wipay" className="dashboard-subscription-card">
      <Drawer.Root
        open={open}
        onOpenChange={setOpen}
        direction="bottom"
        dismissible
        modal
        shouldScaleBackground={false}
      >
        <Drawer.Trigger asChild>
          <button
            type="button"
            className="dashboard-subscription-trigger group flex min-h-16 w-full items-center justify-between gap-4 rounded-card px-4 py-3 text-left smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30 transition-[filter,transform] duration-fast ease-standard hover:brightness-[0.99] active:scale-[0.995] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:px-5"
          >
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-semibold text-text">Paket Free</span>
                <span className="text-xs text-text-muted">{remaining} dari {limit} transaksi tersisa</span>
              </span>
              <span className="mt-1 block text-xs text-text-muted">Lihat pilihan upgrade Pro</span>
            </span>
            <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control bg-text px-3.5 text-sm font-semibold text-white transition-[background-color,transform] duration-fast ease-standard group-hover:bg-text/90 group-active:scale-[0.98] motion-reduce:group-active:scale-100">
              Upgrade ke Pro
              <Icon name="outbound" className="size-4" />
            </span>
          </button>
        </Drawer.Trigger>

        <Drawer.Portal>
          <Drawer.Overlay className="overlay-scrim dashboard-subscription-drawer-overlay fixed inset-0 z-[70]" />
          <Drawer.Content
            aria-describedby={undefined}
            className="dashboard-subscription-drawer fixed inset-x-0 bottom-0 z-[80] mx-auto flex max-h-[min(88svh,40rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-overlay bg-surface outline-none smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30"
          >
            <Drawer.Handle className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-border" />

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="relative bg-surface px-6 pb-6 pt-4 sm:px-8 sm:pb-7">
                <Drawer.Close asChild>
                  <button
                    type="button"
                    aria-label="Tutup detail paket Pro"
                    className="absolute right-4 top-3 grid size-11 place-items-center rounded-control text-text transition-[background-color,transform] duration-fast ease-standard hover:bg-white/45 active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <Icon name="x" className="size-5" />
                  </button>
                </Drawer.Close>
                <Drawer.Title className="pr-12 text-2xl font-semibold tracking-[-0.03em] text-text sm:text-3xl">
                  Wipay Pro
                </Drawer.Title>
                <p className="mt-3 max-w-md text-sm leading-6 text-text-muted">
                  Lanjutkan operasional toko dengan fitur kasir dan pengelolaan stok yang lebih lengkap.
                </p>
                <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1 text-text">
                  <span className="text-4xl font-semibold leading-none tracking-[-0.06em]">Rp99.000</span>
                  <span className="pb-0.5 text-sm text-text-muted">per bulan</span>
                </div>
              </div>

              <div className="mx-auto grid w-full max-w-xl gap-8 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pb-[calc(1.75rem+env(safe-area-inset-bottom))]">
                <div className="rounded-card bg-surface-muted p-4 smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30 sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Yang kamu dapatkan</p>
                  <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {proFeatures.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-text">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-muted text-text">
                          <Icon name="check" className="size-3" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Mulai dengan Pro</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {contacts?.whatsapp ? (
                      <a
                        href={contacts.whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setOpen(false)}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-control bg-text px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-fast ease-standard hover:bg-text/90 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        WhatsApp <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <p className="rounded-control bg-surface-muted px-4 py-3 text-center text-xs text-text-muted">Kontak WhatsApp belum tersedia.</p>
                    )}
                    {contacts?.email ? (
                      <a
                        href={contacts.email}
                        onClick={() => setOpen(false)}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-control bg-surface px-4 text-sm font-semibold text-text smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30 transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        Email <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <p className="rounded-control bg-surface-muted px-4 py-3 text-center text-xs text-text-muted">Kontak email belum tersedia.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </section>
  );
}
