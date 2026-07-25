import React from "react";
import { Icon } from "../primitives.jsx";
import { formatPrice } from "../../shared.jsx";

export function ScanResultConfirmation({
  feedback,
  visible = false,
  announce = true,
  className = "",
}) {
  const successful = feedback?.tone === "success";
  const product = successful ? feedback?.product : null;
  const barcode = product?.barcode || feedback?.description;

  return (
    <div
      className={`scan-result-confirmation ${className}`}
      data-visible={Boolean(visible && feedback)}
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-atomic={announce ? "true" : undefined}
      aria-hidden={!feedback || undefined}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-[10px] ${
          successful
            ? "bg-[#b8f7ce] text-[#104b29]"
            : "bg-[#ffe59a] text-[#5a4100]"
        }`}
        aria-hidden="true"
      >
        <Icon name={successful ? "check" : "help"} className="size-[17px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-5 text-white">{feedback?.message || ""}</span>
        {product?.name ? (
          <span className="mt-0.5 block truncate text-sm font-medium leading-5 text-white/90">
            {product.name}
          </span>
        ) : null}
        {product ? (
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-white/58">
            <span className="shrink-0 font-semibold text-white/72">{formatPrice(product.price)}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">Qty {product.quantity}</span>
            {barcode ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate font-mono">{barcode}</span>
              </>
            ) : null}
          </span>
        ) : feedback?.description ? (
          <span className="mt-0.5 block truncate font-mono text-[11px] leading-4 text-white/58">
            {feedback.description}
          </span>
        ) : null}
      </span>
    </div>
  );
}
