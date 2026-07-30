import React from "react";
import { Button, Dialog, Icon } from "../primitives.jsx";

export default function ModalShowcase() {
  const [open, setOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Modal & Dialog</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Overlay dialogs keep their opaque header and actions visually isolated, with 16px below the title before only the body content scrolls.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpen(true)}>Open modal</Button>
          <Button variant="primary" onClick={() => setConfirmOpen(true)}>Confirm dialog</Button>
        </div>

        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Product details"
          footer={(
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Add to cart</Button>
            </>
          )}
        >
          <div className="grid gap-4">
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
        </Dialog>

        <Dialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          size="sm"
          icon="x"
          iconBg="bg-danger-soft text-danger"
          title="Void this sale?"
          footer={(
            <>
              <Button onClick={() => setConfirmOpen(false)}>Keep sale</Button>
              <Button variant="danger" onClick={() => setConfirmOpen(false)}>Yes, void</Button>
            </>
          )}
        >
          This action cannot be undone. All items will be removed.
        </Dialog>
      </div>
    </div>
  );
}
