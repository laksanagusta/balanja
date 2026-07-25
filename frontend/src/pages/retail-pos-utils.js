export function cashPaymentState(rawValue, total, cartItemCount) {
  const trimmed = String(rawValue ?? "").trim();
  const amount = trimmed === "" ? Number.NaN : Number(trimmed);
  const finite = Number.isFinite(amount) && amount >= 0;
  const hasCart = cartItemCount > 0;
  const sufficient = finite && amount >= total;
  const insufficient = finite && amount < total;

  return {
    amount,
    valid: hasCart && sufficient,
    error: hasCart && !finite
      ? "Masukkan nominal tunai yang valid."
      : hasCart && !sufficient
        ? "Nominal tunai harus menutup total akhir."
        : "",
    showChange: hasCart && sufficient,
    change: hasCart && sufficient ? amount - total : 0,
    showShortfall: hasCart && insufficient,
    shortfall: hasCart && insufficient ? total - amount : 0,
  };
}

export function shouldDismissCartSwipe({ distance, velocity, width }) {
  const distanceThreshold = Math.min(96, Math.max(Number(width) * 0.25, 64));
  return Number(distance) >= distanceThreshold || Number(velocity) >= 0.35;
}

export function resistedCartSwipeDistance(distance, width) {
  const numericDistance = Number(distance) || 0;
  if (numericDistance >= 0) return numericDistance;
  const dimension = Math.max(Number(width) || 1, 1);
  const overshoot = Math.abs(numericDistance);
  return -((overshoot * dimension * 0.22) / (dimension + overshoot * 0.22));
}
