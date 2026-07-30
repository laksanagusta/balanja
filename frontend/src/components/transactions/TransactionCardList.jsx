import React from "react";
import { Badge, Icon } from "../primitives.jsx";
import { ProductImage } from "../product/ProductImage.jsx";
import { formatPrice } from "../../shared.jsx";

function itemCount(transaction) {
  return (transaction.items || []).reduce((sum, item) => sum + Number(item.qty || item.quantity || 0), 0);
}

function paymentLabel(method = "") {
  return method === "cash" ? "Tunai" : method.toUpperCase();
}

function statusPresentation(status) {
  const presentations = {
    pending: { label: "Diproses", tone: "warning" },
    refunded: { label: "Dikembalikan", tone: "warning" },
    voided: { label: "Dibatalkan", tone: "danger" },
    cancelled: { label: "Dibatalkan", tone: "danger" },
    failed: { label: "Gagal", tone: "danger" },
  };
  if (!status || status === "completed") return null;
  return presentations[status] || { label: status, tone: "neutral" };
}

function TransactionProductStack({ items = [] }) {
  const visibleItems = items.slice(0, 3);
  const extraCount = Math.max(items.length - visibleItems.length, 0);
  const rotations = ["-rotate-6 group-hover:-translate-x-1", "-rotate-3 group-hover:-translate-x-0.5", "rotate-0"];

  if (visibleItems.length === 0) return null;

  return (
    <span aria-hidden="true" className="flex items-center pl-2">
      {visibleItems.map((item, index) => (
        <span
          key={`${item.productId || item.barcode || item.name || "product"}-${index}`}
          className={`relative block size-12 shrink-0 overflow-hidden rounded-card border-2 border-white bg-surface-muted shadow-low transition-transform duration-fast ease-standard motion-reduce:transition-none ${
            index ? "-ml-3" : ""
          } ${rotations[index]}`}
          style={{ zIndex: index + 1 }}
        >
          <ProductImage product={{ image: item.image || "" }} fallback="placeholder" />
          {index === visibleItems.length - 1 && extraCount > 0 && (
            <span className="absolute bottom-0.5 right-0.5 grid min-w-6 place-items-center rounded-full border border-white/80 bg-white/95 px-1 py-0.5 font-mono text-[10px] font-semibold leading-none tabular-nums text-text shadow-low">
              +{extraCount}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export function TransactionCardList({ transactions, formatDate, onSelect }) {
  return (
    <ul aria-label="Daftar transaksi" className="grid gap-3">
      {transactions.map((transaction) => {
        const status = statusPresentation(transaction.status);
        return (
          <li key={transaction.id || transaction.number} className="min-w-0">
            <button
              type="button"
              aria-label={`Lihat detail transaksi ${transaction.number}`}
              onClick={() => onSelect?.(transaction)}
              className="group grid min-h-32 w-full gap-4 rounded-panel border border-border bg-surface p-4 text-left shadow-low transition-[background-color,transform,border-color] duration-fast ease-standard hover:border-border-strong hover:bg-surface-muted/45 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span className="flex min-w-0 items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-mono text-lg font-semibold tracking-[-0.01em] tabular-nums text-text">
                    {formatPrice(transaction.total)}
                  </span>
                  <span className="mt-1 block text-sm text-text-muted">{formatDate(transaction.createdAt)}</span>
                </span>
                <span className="grid shrink-0 justify-items-end gap-2">
                  {status && <Badge tone={status.tone}>{status.label}</Badge>}
                  <TransactionProductStack items={transaction.items} />
                </span>
              </span>

              <span className="mt-auto flex min-w-0 items-end justify-between gap-3">
                <span className="grid min-w-0 gap-1">
                  <span className="truncate text-sm text-text-muted">
                    <span className="font-mono text-xs font-medium tabular-nums">{transaction.number}</span>
                    {" · "}
                    {itemCount(transaction)} item · {paymentLabel(transaction.paymentMethod)}
                  </span>
                  <span className="truncate text-xs text-text-subtle">
                    Kasir: {transaction.cashierName || "Tidak diketahui"}
                  </span>
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full text-text-muted transition-[background-color,color] duration-fast ease-standard group-hover:bg-surface-muted group-hover:text-text">
                  <Icon name="chevron" className="size-4 -rotate-90" />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
