export function parseQuantityInput(value) {
  const normalized = String(value ?? "").replace(/[.,\s]/g, "");
  if (!normalized) return 0;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateStockPreview({ type, currentStock, quantity }) {
  const stock = Number(currentStock) || 0;
  const amount = Number(quantity) || 0;
  let delta = 0;

  if (type === "restock") delta = amount;
  if (type === "reduce") delta = -amount;
  if (type === "set_exact") delta = amount - stock;

  const stockAfter = stock + delta;
  const hasValidQuantity = type === "set_exact" ? amount >= 0 : amount > 0;
  const isValid = hasValidQuantity && stockAfter >= 0 && delta !== 0;

  return { delta, stockAfter, isValid };
}
