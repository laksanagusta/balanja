import React from "react";
import { Icon } from "../primitives.jsx";
import { useSwapTransition } from "../../hooks/useSwapTransition.js";
import { ProductThumbnail } from "./ProductImage.jsx";

function inferFilename(source) {
  if (!source) return "";
  try {
    const url = new URL(source);
    return url.pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    return source.split("/").filter(Boolean).pop() || "";
  }
}

export function ProductPhotoField({ product, previewURL, filename, error, disabled, onSelect, onRemove }) {
  const id = React.useId();
  const visible = previewURL || product.image;
  const visibleFilename = filename || inferFilename(previewURL || product.image);
  const photoState = React.useMemo(
    () => ({ visible, filename: visibleFilename }),
    [visible, visibleFilename],
  );
  const { displayedValue, phase } = useSwapTransition(
    photoState,
    `${visible || "empty"}:${visibleFilename}`,
  );
  const displayedVisible = displayedValue.visible;
  const displayedFilename = displayedValue.filename;

  return (
    <fieldset disabled={disabled} className="grid gap-2">
      <legend className="text-sm font-semibold text-text">Foto produk</legend>
      <div
        className={`relative overflow-hidden rounded-card border border-dashed bg-surface-muted/55 transition-[background-color,border-color] duration-fast ${
          error ? "border-danger" : "border-border-strong"
        }`}
      >
        <div
          className={`relative transition-[opacity,transform] ease-standard motion-reduce:scale-100 motion-reduce:duration-fast ${
            phase === "entered"
              ? "scale-100 opacity-100 duration-base"
              : phase === "enter-start"
                ? "scale-[0.98] opacity-0 duration-0"
                : "scale-[0.98] opacity-0 duration-fast"
          }`}
        >
          <label
            htmlFor={id}
            className="flex min-h-32 cursor-pointer items-center justify-center px-5 py-5 text-center transition-colors duration-fast hover:bg-surface-muted focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-focus"
          >
            {displayedVisible ? (
              <span className="flex w-full min-w-0 items-center gap-4 text-left">
                <ProductThumbnail
                  product={{ ...product, image: displayedVisible }}
                  size="xl"
                  fallback="placeholder"
                />
                <span className="min-w-0 flex-1 pr-10">
                  <span className="block text-sm font-semibold text-text">Ganti foto produk</span>
                  <span className="mt-1 block truncate text-xs text-text-muted">
                    {displayedFilename || "Foto produk tersimpan"}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-text-muted">
                    JPG, PNG, atau WebP · maksimal 5 MB
                  </span>
                </span>
              </span>
            ) : (
              <span className="grid justify-items-center gap-2">
                <Icon name="camera" className="size-6 text-text" />
                <span className="text-sm font-semibold text-text">Tambahkan foto produk</span>
                <span className="text-xs leading-5 text-text-muted">
                  JPG, PNG, atau WebP · maksimal 5 MB
                </span>
              </span>
            )}
          </label>
          {displayedVisible && (
            <button
              type="button"
              aria-label="Hapus foto produk"
              title="Hapus foto produk"
              disabled={disabled}
              onClick={onRemove}
              className="absolute right-2 top-2 grid size-11 place-items-center rounded-control bg-surface/90 text-danger transition-[transform,background-color] duration-fast ease-standard hover:bg-danger-soft active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Icon name="trash" className="size-5" />
            </button>
          )}
        </div>
        <input
          id={id}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          disabled={disabled}
          onChange={(event) => onSelect(event.target.files?.[0] || null)}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
