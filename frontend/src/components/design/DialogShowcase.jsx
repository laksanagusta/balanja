import React from "react";
import { Button, Dialog, Icon } from "../primitives.jsx";

export default function DialogShowcase() {
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [dangerOpen, setDangerOpen] = React.useState(false);
  const [unknownBarcodeOpen, setUnknownBarcodeOpen] = React.useState(false);

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Dialog</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Reusable dialog primitive with size, icon, and footer variants.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setInfoOpen(true)}>Info dialog</Button>
          <Button variant="primary" onClick={() => setConfirmOpen(true)}>Confirm dialog</Button>
          <Button variant="danger" onClick={() => setDangerOpen(true)}>Danger dialog</Button>
          <Button onClick={() => setUnknownBarcodeOpen(true)}>Unknown barcode</Button>
        </div>

        <Dialog
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          title="Item details"
          footer={
            <>
              <Button onClick={() => setInfoOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setInfoOpen(false)}>Add to cart</Button>
            </>
          }
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
          icon="check"
          iconBg="bg-success-soft text-success"
          title="Complete sale"
          footer={
            <>
              <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setConfirmOpen(false)}>Confirm</Button>
            </>
          }
        >
          Complete sale for <strong className="text-text">Rp45.500</strong>? Stock will be updated after confirmation.
        </Dialog>

        <Dialog
          open={dangerOpen}
          onClose={() => setDangerOpen(false)}
          icon="x"
          iconBg="bg-danger-soft text-danger"
          title="Void this sale?"
          footer={
            <>
              <Button onClick={() => setDangerOpen(false)}>Keep sale</Button>
              <Button variant="danger" onClick={() => setDangerOpen(false)}>Yes, void</Button>
            </>
          }
        >
          This action cannot be undone. All items will be removed from the cart.
        </Dialog>

        <Dialog
          open={unknownBarcodeOpen}
          onClose={() => setUnknownBarcodeOpen(false)}
          title="Barcode not found"
          footer={
            <>
              <Button onClick={() => setUnknownBarcodeOpen(false)}>Cancel</Button>
              <Button onClick={() => setUnknownBarcodeOpen(false)}>Scan again</Button>
              <Button variant="primary" onClick={() => setUnknownBarcodeOpen(false)}>Add product</Button>
            </>
          }
        >
          <p className="mt-4">
            Barcode <span className="font-mono font-semibold text-text">8997001230011</span> is not in the product catalog.
          </p>
        </Dialog>
      </div>
    </div>
  );
}
