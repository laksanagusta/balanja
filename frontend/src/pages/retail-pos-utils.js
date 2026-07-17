export function cashPaymentState(rawValue, total, cartItemCount) {
  const trimmed = String(rawValue ?? "").trim();
  const amount = trimmed === "" ? Number.NaN : Number(trimmed);
  const finite = Number.isFinite(amount) && amount >= 0;
  const hasCart = cartItemCount > 0;
  const sufficient = finite && amount >= total;

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
  };
}
