import React from "react";
import { Icon } from "../primitives.jsx";
const fallbackImages = {
  Sembako: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
  Minuman: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80",
  Snack: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80",
  Perawatan: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80",
  "Rumah Tangga": "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
};
export function ProductImage({ product, className = "h-full w-full object-cover" }) {
  const fallback = fallbackImages[product?.category] || fallbackImages.Sembako;
  const [src, setSrc] = React.useState(product?.image || fallback);
  React.useEffect(() => setSrc(product?.image || fallback), [product?.image, fallback]);
  if (!src) return <span className="grid h-full w-full place-items-center text-text-muted"><Icon name="package" className="size-5" /></span>;
  return <img src={src} alt="" className={className} loading="lazy" decoding="async" onError={() => setSrc(src === fallback ? "" : fallback)} />;
}
export function ProductThumbnail({ product, size = "md" }) {
  return <span className={`${size === "lg" ? "size-16" : "size-10"} block shrink-0 overflow-hidden rounded-card border border-border bg-surface-muted`}><ProductImage product={product} /></span>;
}
