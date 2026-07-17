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
}) {
  return (
    <div className="grid gap-4">
      <h2 className="text-base font-semibold text-text">Ringkasan pembayaran</h2>
      <dl className="grid gap-3 text-sm">
        {[
          ["Subtotal", formatPrice(subtotal)],
          ["Pajak", formatPrice(tax)],
          ...(discount > 0 ? [["Diskon", `-${formatPrice(discount)}`]] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-text-muted">
            <dt>{label}</dt>
            <dd className="font-mono font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="border-t border-dashed border-border pt-3">
          <div className="flex justify-between text-base font-semibold text-text">
            <dt>Total akhir</dt>
            <dd className="font-mono tabular-nums">{formatPrice(grandTotal)}</dd>
          </div>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2" aria-label="Metode pembayaran">
        {paymentMethods.map((method) => (
          <Pill
            key={method.id}
            selected={paymentMethod === method.id}
            aria-pressed={paymentMethod === method.id}
            disabled={disabled}
            onClick={() => onPaymentMethodChange(method.id)}
            className="gap-1.5"
          >
            <Icon name={method.icon} className="size-4" />
            {method.label}
          </Pill>
        ))}
      </div>
    </div>
  );
}
