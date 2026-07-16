export function readTransactionFilters(search = "") {
  const params = new URLSearchParams(search);
  const paymentMethod = params.get("paymentMethod") || "";
  return {
    paymentMethod: paymentMethod === "cash" || paymentMethod === "qris" ? paymentMethod : "",
    dateFrom: isoDate(params.get("dateFrom")),
    dateTo: isoDate(params.get("dateTo")),
  };
}

export function dateBoundaryWIB(value, endOfDay = false) {
  const date = isoDate(value);
  if (!date) return "";
  return new Date(`${date}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`).toISOString();
}

function isoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? "" : value;
}
