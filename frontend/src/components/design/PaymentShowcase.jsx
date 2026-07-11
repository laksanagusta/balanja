import React from "react";
import { Button, Icon, Pill } from "../primitives.jsx";

export function PaymentSummary({
  subtotal,
  tax,
  discount,
  grandTotal,
  paymentMethod,
  onPaymentMethodChange,
  promoCode,
  onPromoCodeChange,
  onApplyPromo,
  onPlaceOrder,
  placed,
  formatPrice,
}) {
  return (
    <div className="grid gap-4">
      <h2 className="text-base font-semibold text-text">Total Payment</h2>
      <dl className="grid gap-3 text-sm">
        {[
          ["Subtotal", formatPrice(subtotal)],
          ["Tax", formatPrice(tax)],
          ...(discount > 0 ? [["Discount", "-" + formatPrice(discount)]] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-text-muted">
            <dt>{label}</dt>
            <dd className="font-semibold font-mono tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="border-t border-dashed border-border pt-3">
          <div className="flex justify-between text-base font-semibold text-text">
            <dt>Grand Total</dt>
            <dd className="font-mono tabular-nums">{formatPrice(grandTotal)}</dd>
          </div>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {[
          { id: "cash", label: "Cash", icon: "cash" },
          { id: "qris", label: "QRIS", icon: "qr" },
        ].map((m) => (
          <Pill
            key={m.id}
            selected={paymentMethod === m.id}
            onClick={() => onPaymentMethodChange(m.id)}
            className="gap-1.5"
          >
            <Icon name={m.icon} className="size-4" />
            {m.label}
          </Pill>
        ))}
      </div>
      {onPromoCodeChange && (
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <input
            className="h-[42px] rounded-card border border-border bg-surface px-4 text-sm font-medium outline-none placeholder:text-text-subtle focus:border-border-strong focus:outline-2 focus:outline-focus/30"
            placeholder="Enter promo code"
            value={promoCode}
            onChange={(e) => onPromoCodeChange(e.target.value)}
          />
          <Button onClick={onApplyPromo}>Apply</Button>
        </div>
      )}
      {onPlaceOrder && (
        <Button variant="primary" onClick={onPlaceOrder}>
          {placed ? "Sale completed" : "Complete sale"}
        </Button>
      )}
    </div>
  );
}

const methods = [
  { name: "Cash", icon: "cash" },
  { name: "QRIS", icon: "qr" },
];

export default function PaymentShowcase() {
  const [selected, setSelected] = React.useState("Cash");

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Payment methods</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Select payment method and enter the received amount.</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => (
              <button
                key={m.name}
                onClick={() => setSelected(m.name)}
                className={`grid place-items-center gap-1.5 rounded-card border p-4 text-sm font-semibold transition ${
                  selected === m.name
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-surface text-text-muted hover:bg-surface-muted"
                }`}
              >
                <Icon name={m.icon} className="size-6" />
                {m.name}
              </button>
            ))}
          </div>
          <div className="grid content-start gap-3 rounded-card border border-border bg-surface-muted p-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Total due</span>
              <span className="font-mono font-semibold tabular-nums text-text">Rp45.500</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Amount paid</span>
              <span className="font-mono font-semibold tabular-nums text-text">Rp50.000</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-success">
              <span>Change</span>
              <span className="font-mono tabular-nums">Rp4.500</span>
            </div>
            <Button variant="primary" className="mt-2 h-12 w-full text-base">
              <Icon name="check" className="size-5" />
              Confirm payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
