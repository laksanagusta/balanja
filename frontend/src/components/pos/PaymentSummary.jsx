import React from "react";
import { Icon, Pill } from "../primitives.jsx";

const paymentMethods = [
  { id: "cash", label: "Tunai", icon: "cash" },
  { id: "qris", label: "QRIS", icon: "qr" },
];

export function PaymentSummary({
  subtotal,
  tax,
  discount,
  grandTotal,
  paymentMethod,
  onPaymentMethodChange,
  formatPrice,
  disabled = false,
  showTitle = true,
}) {
  return (
    <div className="grid gap-4">
      {showTitle ? <h2 className="text-base font-semibold text-text">Ringkasan pembayaran</h2> : null}
      <dl className="grid gap-3 text-sm">
        {[
          ["Subtotal", formatPrice(subtotal)],
          ["Pajak", formatPrice(tax)],
          ...(discount > 0 ? [["Diskon", `-${formatPrice(discount)}`]] : []),
        ].map(([label, value]) => (
          <div key={label} className="payment-summary-row text-text-muted">
            <dt>{label}</dt>
            <dd className="whitespace-nowrap font-mono font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="border-t border-dashed border-border pt-3">
          <div className="payment-summary-row text-base font-semibold text-text">
            <dt>Total akhir</dt>
            <dd className="whitespace-nowrap font-mono tabular-nums">{formatPrice(grandTotal)}</dd>
          </div>
        </div>
      </dl>
      <div className="grid gap-2" aria-label="Metode pembayaran">
        {paymentMethods.map((method) => (
          <Pill
            key={method.id}
            selected={paymentMethod === method.id}
            aria-pressed={paymentMethod === method.id}
            disabled={disabled}
            onClick={() => onPaymentMethodChange(method.id)}
            className="pos-touch-target w-full justify-center gap-1.5"
          >
            <Icon name={method.icon} className="size-4" />
            {method.label}
          </Pill>
        ))}
      </div>
    </div>
  );
}
