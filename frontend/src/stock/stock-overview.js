export const LOW_STOCK_THRESHOLD = 10;
export const LOW_STOCK_VISIBLE_LIMIT = 5;

export function getLowStockProducts(products, threshold = LOW_STOCK_THRESHOLD) {
  return (Array.isArray(products) ? products : [])
    .filter((product) => product?.active)
    .flatMap((product) => {
      if (product.attributesConfig?.length > 0 && Array.isArray(product.variants)) {
        return product.variants
          .filter((variant) => variant.active !== false && Object.keys(variant.attributes || {}).length > 0)
          .map((variant) => ({
            ...product,
            stock: variant.stock,
            variantId: variant.id,
            variantAttributes: Object.entries(variant.attributes || {}).map(([name, value]) => `${name}: ${value}`).join(", "),
          }));
      }
      return [product];
    })
    .filter((product) => Number.isFinite(Number(product.stock)) && Number(product.stock) <= threshold)
    .sort((left, right) => (
      Number(left.stock) - Number(right.stock)
      || String(left.name || "").localeCompare(String(right.name || ""), "id-ID")
    ));
}

export function getStockProgress(stock, threshold = LOW_STOCK_THRESHOLD) {
  const numericStock = Number(stock);
  const numericThreshold = Number(threshold);
  if (!Number.isFinite(numericStock) || !Number.isFinite(numericThreshold) || numericThreshold <= 0) return 0;
  return Math.max(0, Math.min(100, (numericStock / numericThreshold) * 100));
}

export function getMovementPresentation(type) {
  if (type === "restock") return { label: "Stok masuk", icon: "inbound", tone: "success" };
  if (type === "sale") return { label: "Penjualan", icon: "outbound", tone: "danger" };
  if (type === "reduce") return { label: "Stok keluar", icon: "outbound", tone: "warning" };
  if (type === "set_exact") return { label: "Penyesuaian stok", icon: "adjust", tone: "neutral" };
  return { label: "Pergerakan stok", icon: "adjust", tone: "neutral" };
}

export function formatRelativeTime(value, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  const currentTime = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(timestamp) || !Number.isFinite(currentTime)) return "-";

  const difference = timestamp - currentTime;
  const absoluteDifference = Math.abs(difference);
  if (absoluteDifference < 45_000) return "Baru saja";

  const formatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  const units = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
  ];
  const [unit, duration] = units.find(([, unitDuration]) => absoluteDifference >= unitDuration) || units.at(-1);
  return formatter.format(Math.round(difference / duration), unit);
}
