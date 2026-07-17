import React from "react";
import { ProductThumbnail } from "./ProductImage.jsx";
export function ProductPhotoField({ product, previewURL, filename, error, disabled, onSelect, onRemove }) {
  const id = React.useId(); const visible = previewURL || product.image;
  return <fieldset disabled={disabled} className="grid gap-2"><legend className="text-sm font-semibold text-text">Foto produk</legend>
    <div className={`flex flex-wrap items-center gap-3 rounded-card border bg-surface p-3 ${error ? "border-danger" : "border-border"}`}><ProductThumbnail product={{ ...product, image: visible }} size="lg" />
      <div className="min-w-[150px] flex-1"><p className="truncate text-sm font-medium text-text">{filename || (visible ? "Foto saat ini" : "Belum ada foto")}</p><p className="text-xs text-text-muted">JPG, PNG, atau WebP. Maksimal 5 MB.</p></div>
      <label htmlFor={id} className="inline-flex h-9 cursor-pointer items-center rounded-control border border-border px-3 text-sm font-semibold text-text">{visible ? "Ganti" : "Pilih foto"}</label><input id={id} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => onSelect(event.target.files?.[0] || null)} />
      {visible && <button type="button" disabled={disabled} onClick={onRemove} className="h-9 rounded-control px-3 text-sm font-semibold text-danger">Hapus</button>}</div>{error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
  </fieldset>;
}
