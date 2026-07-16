const WIB_TIME_ZONE = "Asia/Jakarta";
const DAY_MS = 24 * 60 * 60 * 1000;

export function defaultReportFilters(now = new Date()) {
  return { preset: "30d", paymentMethod: "", cashierUserId: "", ...presetRange("30d", now) };
}

export function presetRange(preset, now = new Date()) {
  const today = dateInWIB(now);
  if (preset === "today") return { dateFrom: today, dateTo: today };
  if (preset === "7d") return { dateFrom: shiftISODate(today, -6), dateTo: today };
  if (preset === "month") return { dateFrom: `${today.slice(0, 8)}01`, dateTo: today };
  return { dateFrom: shiftISODate(today, -29), dateTo: today };
}

export function validateCustomRange(dateFrom, dateTo, today = dateInWIB(new Date())) {
  if (!validISODate(dateFrom) || !validISODate(dateTo)) return { valid: false, error: "Pilih rentang tanggal yang valid." };
  const start = Date.parse(`${dateFrom}T00:00:00.000Z`);
  const end = Date.parse(`${dateTo}T00:00:00.000Z`);
  if (end < start) return { valid: false, error: "Tanggal akhir tidak boleh sebelum tanggal awal." };
  if (dateTo > today) return { valid: false, error: "Tanggal laporan tidak boleh melewati hari ini." };
  if ((end - start) / DAY_MS + 1 > 366) return { valid: false, error: "Rentang laporan maksimal 366 hari." };
  return { valid: true, error: "" };
}

export function alignTrend(current = [], previous = []) {
  return Array.from({ length: Math.max(current.length, previous.length) }, (_, index) => ({
    label: current[index]?.label || previous[index]?.label || "",
    current: current[index]?.totalReceived || 0,
    previous: previous[index]?.totalReceived || 0,
    currentBucket: current[index]?.bucket || "",
    previousBucket: previous[index]?.bucket || "",
  }));
}

export function transactionHandoff(filters) {
  const params = new URLSearchParams();
  for (const key of ["dateFrom", "dateTo", "paymentMethod"]) {
    if (filters?.[key]) params.set(key, filters[key]);
  }
  const query = params.toString();
  return `/transactions${query ? `?${query}` : ""}`;
}

export function cashierLabel(name, userId) {
  const normalized = String(name || "").trim();
  return normalized || `Pengguna ${Array.from(String(userId || "")).slice(0, 8).join("")}`;
}

export function comparisonCopy(comparison = {}) {
  if (comparison.percent === null || comparison.percent === undefined) return "Tidak ada data pembanding";
  const value = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(Math.abs(comparison.percent));
  if (comparison.direction === "up") return `Naik ${value}% dari periode sebelumnya`;
  if (comparison.direction === "down") return `Turun ${value}% dari periode sebelumnya`;
  return "Sama dengan periode sebelumnya";
}

export function downloadBlob({ blob, filename }, browser = globalThis) {
  const url = browser.URL.createObjectURL(blob);
  const anchor = browser.document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    browser.document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    browser.URL.revokeObjectURL(url);
  }
}

function dateInWIB(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftISODate(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}
