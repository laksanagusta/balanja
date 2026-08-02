import React from "react";
import { SwapText } from "../motion/SwapText.jsx";
import { Button, Dialog, Icon, Input, SelectField } from "../primitives.jsx";

export default function ModalFormShowcase() {
  const [productOpen, setProductOpen] = React.useState(false);
  const [productSaving, setProductSaving] = React.useState(false);
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [discountOpen, setDiscountOpen] = React.useState(false);
  const productSaveTimerRef = React.useRef(0);

  React.useEffect(
    () => () => window.clearTimeout(productSaveTimerRef.current),
    [],
  );

  const saveProductExample = () => {
    if (productSaving) return;
    setProductSaving(true);
    productSaveTimerRef.current = window.setTimeout(() => {
      setProductSaving(false);
      setProductOpen(false);
    }, 900);
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Modal form</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Form dialogs for retail data entry — popover fields portal above the dialog layer so their options stay visible and unclipped.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setProductOpen(true)}>Add product</Button>
          <Button onClick={() => setCustomerOpen(true)}>Customer info</Button>
          <Button variant="primary" onClick={() => setDiscountOpen(true)}>Apply discount</Button>
        </div>

        <Dialog
          open={productOpen}
          onClose={() => {
            if (!productSaving) setProductOpen(false);
          }}
          title="Add product"
          size="md"
          footer={
            <>
              <Button disabled={productSaving} onClick={() => setProductOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={productSaving} className="min-w-32" onClick={saveProductExample}>
                <SwapText value={productSaving ? "Saving..." : "Save product"} />
              </Button>
            </>
          }
        >
          <div className="mt-4 grid gap-2">
            <Input label="Product name" placeholder="e.g. Beras Premium 5kg" inputProps={{ defaultValue: "" }} />
            <div className="grid gap-2">
              <span className="text-sm font-semibold text-text">Barcode</span>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    placeholder="8997001230011"
                    inputClassName="font-mono tabular-nums tracking-[0.01em]"
                    inputProps={{ defaultValue: "" }}
                  />
                </div>
                <button type="button" aria-label="Scan barcode" className="grid size-9 shrink-0 place-items-center rounded-control text-text-muted hover:bg-surface-muted hover:text-text">
                  <Icon name="scan" className="size-5" />
                </button>
              </div>
            </div>
            <SelectField label="Category" value="Sembako" options={["Sembako", "Minuman", "Makanan Instan", "Rumah Tangga", "Perawatan"]} />
            <Input label="Price" placeholder="72000" inputClassName="font-mono tabular-nums" inputProps={{ type: "number", defaultValue: "" }} />
            <Input label="Stock" placeholder="18" inputClassName="font-mono tabular-nums" inputProps={{ type: "number", defaultValue: "" }} />
          </div>
        </Dialog>

        <Dialog
          open={customerOpen}
          onClose={() => setCustomerOpen(false)}
          title="Customer details"
          icon="users"
          size="md"
          footer={
            <>
              <Button onClick={() => setCustomerOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setCustomerOpen(false)}>Save</Button>
            </>
          }
        >
          <div className="mt-4 grid gap-2">
            <Input label="Full name" placeholder="e.g. John Doe" inputProps={{ defaultValue: "" }} />
            <Input label="Phone number" placeholder="+62 812-3456-7890" inputProps={{ defaultValue: "" }} />
            <Input label="Email" placeholder="john@example.com" inputProps={{ type: "email", defaultValue: "" }} />
            <SelectField label="Customer type" value="Regular" options={["Regular", "VIP", "New"]} />
          </div>
        </Dialog>

        <Dialog
          open={discountOpen}
          onClose={() => setDiscountOpen(false)}
          title="Apply discount"
          size="sm"
          footer={
            <>
              <Button onClick={() => setDiscountOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setDiscountOpen(false)}>Apply</Button>
            </>
          }
        >
          <div className="mt-4 grid gap-2">
            <SelectField label="Discount type" value="Percentage" options={["Percentage", "Fixed amount"]} />
            <Input label="Value" placeholder="10" inputProps={{ type: "number", defaultValue: "" }} />
            <Input label="Reason (optional)" placeholder="e.g. Loyalty program" inputProps={{ defaultValue: "" }} />
          </div>
        </Dialog>
      </div>
    </div>
  );
}
