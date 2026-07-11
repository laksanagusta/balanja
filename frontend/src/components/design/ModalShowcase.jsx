import React from "react";
import { Button, Icon } from "../primitives.jsx";

export default function ModalShowcase() {
  const [open, setOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Modal & Dialog</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Overlay dialogs for confirmations, product details, and payment.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpen(true)}>Open modal</Button>
          <Button variant="primary" onClick={() => setConfirmOpen(true)}>Confirm dialog</Button>
        </div>

        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-md rounded-panel border border-border bg-surface p-6 shadow-panel">
              <div className="mb-5 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-text">Product details</h4>
                <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text">
                  <Icon name="x" className="size-5" />
                </button>
              </div>
              <div className="mb-6 grid gap-4">
                <div className="flex gap-4">
                  <div className="flex size-20 items-center justify-center rounded-card bg-surface-muted text-text-subtle">
                    <Icon name="box" className="size-8" />
                  </div>
                  <div className="grid content-start gap-1">
                    <p className="text-lg font-semibold text-text">Beras Premium 5kg</p>
                    <p className="text-sm text-text-muted">Category: Sembako</p>
                    <p className="font-mono text-lg font-semibold tabular-nums text-accent">Rp72.000</p>
                  </div>
                </div>
                <div className="rounded-card border border-border bg-surface-muted p-4 text-sm text-text-muted">
                  Barcode: 8997001230011. Stock: 18 karung.
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setOpen(false)}>Add to cart</Button>
              </div>
            </div>
          </div>
        )}

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
            <div className="relative w-full max-w-sm rounded-panel border border-border bg-surface p-6 shadow-panel text-center">
              <div className="mb-4 mx-auto flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
                <Icon name="x" className="size-6" />
              </div>
              <h4 className="mb-2 text-lg font-semibold text-text">Void this sale?</h4>
              <p className="mb-6 text-sm text-text-muted">This action cannot be undone. All items will be removed.</p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => setConfirmOpen(false)}>Keep sale</Button>
                <Button variant="danger" onClick={() => setConfirmOpen(false)}>Yes, void</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
