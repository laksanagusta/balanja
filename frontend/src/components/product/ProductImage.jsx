import React from "react";
import { Icon } from "../primitives.jsx";

const PRIMARY_IMAGE_RETRY_DELAYS_MS = [500, 1500, 3000];

const fallbackImages = {
  Sembako: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
  Minuman: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80",
  Snack: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80",
  Perawatan: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80",
  "Rumah Tangga": "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
};

function withRetryQuery(source, retry) {
  const hashAt = source.indexOf("#");
  const path = hashAt === -1 ? source : source.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : source.slice(hashAt);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}balanja_image_retry=${retry}${hash}`;
}

export function ProductImage({ product, fallback = "category", className = "h-full w-full object-cover" }) {
  const primarySource = product?.image || "";
  const categoryFallback = fallbackImages[product?.category] || fallbackImages.Sembako;
  const fallbackSource = fallback === "placeholder" ? "" : categoryFallback;
  const [src, setSrc] = React.useState(primarySource || fallbackSource);
  const primaryFailedRef = React.useRef(false);
  const showingPrimaryRef = React.useRef(Boolean(primarySource));
  const retryCountRef = React.useRef(0);
  const retryTimerRef = React.useRef(null);

  const retryPrimary = React.useCallback(() => {
    if (!primarySource || !primaryFailedRef.current) return;
    window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    primaryFailedRef.current = false;
    showingPrimaryRef.current = true;
    retryCountRef.current += 1;
    setSrc(withRetryQuery(primarySource, retryCountRef.current));
  }, [primarySource]);

  React.useEffect(() => {
    window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    primaryFailedRef.current = false;
    showingPrimaryRef.current = Boolean(primarySource);
    retryCountRef.current = 0;
    setSrc(primarySource || fallbackSource);
  }, [primarySource, fallbackSource]);

  React.useEffect(() => {
    if (!primarySource) return undefined;
    const retryWhenVisible = () => {
      if (document.visibilityState === "visible") retryPrimary();
    };
    window.addEventListener("online", retryPrimary);
    window.addEventListener("pageshow", retryPrimary);
    document.addEventListener("visibilitychange", retryWhenVisible);
    return () => {
      window.removeEventListener("online", retryPrimary);
      window.removeEventListener("pageshow", retryPrimary);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, [primarySource, retryPrimary]);

  React.useEffect(() => () => window.clearTimeout(retryTimerRef.current), []);

  const handleError = () => {
    if (primarySource && showingPrimaryRef.current) {
      primaryFailedRef.current = true;
      showingPrimaryRef.current = false;
      setSrc("");
      const retryDelay = PRIMARY_IMAGE_RETRY_DELAYS_MS[retryCountRef.current];
      if (retryDelay !== undefined) {
        retryTimerRef.current = window.setTimeout(retryPrimary, retryDelay);
      }
      return;
    }
    setSrc("");
  };

  if (!src) {
    return (
      <span className="grid h-full w-full place-items-center bg-surface-muted text-text-subtle">
        <Icon name="image" className="size-6" />
      </span>
    );
  }
  return <img src={src} alt="" className={className} loading="lazy" decoding="async" onError={handleError} />;
}
export function ProductThumbnail({ product, size = "md", fallback = "category", radius = "card" }) {
  const sizeClass = size === "xl" ? "size-20" : size === "lg" ? "size-16" : "size-10";
  const radiusClass = radius === "control" ? "rounded-control" : "rounded-card";
  return <span className={`${sizeClass} block shrink-0 overflow-hidden ${radiusClass} border border-border bg-surface-muted`}><ProductImage product={product} fallback={fallback} /></span>;
}
