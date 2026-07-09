import React from "react";
import { Button, Dialog, Input, SelectField } from "../primitives.jsx";

export default function ModalFormShowcase() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [discountOpen, setDiscountOpen] = React.useState(false);

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Modal form</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Form dialogs for data entry — add item, customer info, discount.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMenuOpen(true)}>Add menu item</Button>
          <Button onClick={() => setCustomerOpen(true)}>Customer info</Button>
          <Button variant="primary" onClick={() => setDiscountOpen(true)}>Apply discount</Button>
        </div>

        <Dialog
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          title="Add menu item"
          size="md"
          footer={
            <>
              <Button onClick={() => setMenuOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setMenuOpen(false)}>Save item</Button>
            </>
          }
        >
          <div className="mt-4 grid gap-4">
            <Input label="Item name" placeholder="e.g. Nasi Goreng Spesial" inputProps={{ defaultValue: "" }} />
            <SelectField label="Category" value="Main Course" options={["Appetizers", "Main Course", "Drinks", "Desserts"]} />
            <Input label="Price" placeholder="0.00" inputProps={{ type: "number", step: "0.01", defaultValue: "" }} />
            <Input label="Description" placeholder="Optional notes about the item" inputProps={{ defaultValue: "" }} />
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
          <div className="mt-4 grid gap-4">
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
          <div className="mt-4 grid gap-4">
            <SelectField label="Discount type" value="Percentage" options={["Percentage", "Fixed amount"]} />
            <Input label="Value" placeholder="10" inputProps={{ type: "number", defaultValue: "" }} />
            <Input label="Reason (optional)" placeholder="e.g. Loyalty program" inputProps={{ defaultValue: "" }} />
          </div>
        </Dialog>
      </div>
    </div>
  );
}
