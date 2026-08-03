import React from "react";
import { Drawer } from "vaul";
import { useOverlayDepth } from "../primitives.jsx";
import { formatPrice } from "../../shared.jsx";

function formatReceiptDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TransactionReceiptDrawer({ transaction, onClose }) {
  useOverlayDepth(Boolean(transaction));

  if (!transaction) return null;

  return (
    <Drawer.Root
      open={Boolean(transaction)}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
      direction="bottom"
      dismissible
      modal
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="overlay-scrim transaction-detail-drawer-overlay fixed inset-0 z-[70]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="transaction-detail-drawer fixed inset-0 z-[80] m-auto flex h-[min(90svh,48rem)] max-h-[calc(100svh-1rem)] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-overlay border border-border bg-surface-muted px-2 py-2 outline-none shadow-panel sm:px-3 sm:py-3"
        >
          <Drawer.Handle className="transaction-receipt-handle mx-auto mb-3 mt-0 h-1.5 w-12 shrink-0 rounded-full bg-border" />
          <header className="transaction-receipt-controls relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 pb-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <Drawer.Title className="truncate text-lg font-semibold tracking-[-0.01em] text-text">
                Receipt
              </Drawer.Title>
              <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-text-muted">
                {transaction?.number || "—"}
              </span>
            </div>
          </header>

          <div className="transaction-receipt-paper-frame relative min-h-0 flex-1">
            <div className="transaction-receipt-paper relative h-full min-h-0 overflow-hidden rounded-card bg-surface">
              <div className="transaction-receipt-scroll relative min-h-0 h-full overflow-y-auto px-5 py-8 sm:px-8 sm:py-10">
              <div className="text-center font-mono">
                <p className="font-mono text-sm font-semibold tracking-[0.24em] text-text">BALANJA</p>
                <p className="mt-2 text-xs text-text-muted">Detail transaksi</p>
                <p className="mt-1 font-mono text-xs tabular-nums text-text-subtle">{formatReceiptDate(transaction.createdAt)}</p>
              </div>

              <div className="transaction-receipt-divider my-4" aria-hidden="true" />

              <div className="grid gap-3 font-mono text-sm">
                {(transaction.items || []).map((item) => (
                  <div key={item.productId} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text">{item.name}</p>
                      <p className="font-mono text-xs text-text-subtle">x{item.qty}</p>
                    </div>
                    <p className="shrink-0 font-mono tabular-nums text-text">
                      {formatPrice(item.qty * item.price)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="transaction-receipt-divider my-4" aria-hidden="true" />

              <dl className="grid gap-2 font-mono text-sm">
                <div className="flex justify-between gap-4 text-text-muted">
                  <dt>Subtotal</dt>
                  <dd className="font-mono tabular-nums">{formatPrice(transaction.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-text-muted">
                  <dt>Pajak</dt>
                  <dd className="font-mono tabular-nums">{formatPrice(transaction.tax)}</dd>
                </div>
                <div className="flex justify-between gap-4 pt-2 text-base font-semibold text-text">
                  <dt>Total</dt>
                  <dd className="font-mono tabular-nums">{formatPrice(transaction.total)}</dd>
                </div>
              </dl>
              </div>
            </div>
          </div>

          <footer className="transaction-receipt-controls relative z-10 grid shrink-0 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 sm:px-8">
            <Drawer.Close asChild>
              <button
                type="button"
                className="transaction-receipt-close justify-self-center text-sm font-semibold text-text-muted underline-offset-4 transition-[color,text-decoration-color] duration-fast ease-standard hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Tutup
              </button>
            </Drawer.Close>
          </footer>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
