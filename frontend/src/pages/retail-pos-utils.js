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
  const deceleration = 0.998;
  const projectedDistance =
    (Number(distance) || 0) +
    (Number(velocity) || 0) * (deceleration / (1 - deceleration));

  return projectedDistance >= distanceThreshold;
}

export function resistedCartSwipeDistance(distance, width) {
  return resistedCartTranslation(distance, width);
}

export function resistedCartTranslation(translation, width) {
  const numericTranslation = Number(translation) || 0;
  const dimension = Math.max(Number(width) || 1, 1);

  if (numericTranslation < 0) {
    const overshoot = Math.abs(numericTranslation);
    return -((overshoot * dimension * 0.22) / (dimension + overshoot * 0.22));
  }

  if (numericTranslation > dimension) {
    const overshoot = numericTranslation - dimension;
    return (
      dimension +
      (overshoot * dimension * 0.22) / (dimension + overshoot * 0.22)
    );
  }

  return numericTranslation;
}

export function cartSwipeVelocity(samples, windowMs = 100) {
  if (!Array.isArray(samples) || samples.length < 2) return 0;

  const last = samples[samples.length - 1];
  const cutoff = Number(last.time) - Math.max(Number(windowMs) || 0, 0);
  const recent = samples.filter((sample) => Number(sample.time) >= cutoff);
  if (recent.length < 2) return 0;

  const first = recent[0];
  const elapsed = Number(last.time) - Number(first.time);
  if (elapsed <= 0) return 0;

  return ((Number(last.x) - Number(first.x)) / elapsed) * 1000;
}

export function isCartFocusCandidate(element) {
  if (!element || typeof element.getClientRects !== "function") return false;
  if (
    typeof element.closest === "function" &&
    element.closest('[inert], [aria-hidden="true"]')
  ) {
    return false;
  }

  return element.getClientRects().length > 0;
}
