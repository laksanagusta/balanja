const fullDateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

export function localizedTrendTitle(point = {}) {
  const date = new Date(point.date);
  if (Number.isNaN(date.getTime())) return String(point.label || "");
  const hourly = String(point.currentBucket || "").includes("T");
  if (hourly && point.label) return `${shortDateFormatter.format(date)} · ${point.label}`;
  return fullDateFormatter.format(date);
}
