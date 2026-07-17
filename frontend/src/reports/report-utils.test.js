import test from "node:test";
import assert from "node:assert/strict";
import {
  alignTrend,
  cashierLabel,
  comparisonCopy,
  defaultReportFilters,
  downloadBlob,
  presetRange,
  transactionHandoff,
  validateCustomRange,
} from "./report-utils.js";

test("report presets use the WIB calendar at UTC boundaries", () => {
  const now = new Date("2026-07-16T18:30:00.000Z");
  assert.deepEqual(presetRange("30d", now), { dateFrom: "2026-06-18", dateTo: "2026-07-17" });
  assert.deepEqual(presetRange("today", now), { dateFrom: "2026-07-17", dateTo: "2026-07-17" });
  assert.deepEqual(presetRange("month", now), { dateFrom: "2026-07-01", dateTo: "2026-07-17" });
  assert.equal(defaultReportFilters(now).preset, "30d");
});

test("custom report ranges enforce 366 inclusive days", () => {
  assert.equal(validateCustomRange("2024-01-01", "2024-12-31", "2026-07-17").valid, true);
  assert.equal(validateCustomRange("2024-01-01", "2025-01-01", "2026-07-17").valid, false);
  assert.equal(validateCustomRange("2026-07-18", "2026-07-18", "2026-07-17").valid, false);
});

test("aligns current and comparison trends by relative position", () => {
  const aligned = alignTrend(
    [{ bucket: "2026-07-17", label: "17 Jul", totalReceived: 10 }],
    [{ bucket: "2026-07-16", label: "16 Jul", totalReceived: 5 }, { bucket: "2026-07-15", label: "15 Jul", totalReceived: 8 }],
  );
  assert.deepEqual(aligned, [
    { date: "2026-07-17", label: "17 Jul", current: 10, previous: 5, currentBucket: "2026-07-17", previousBucket: "2026-07-16" },
    { date: "2026-07-15", label: "15 Jul", current: 0, previous: 8, currentBucket: "", previousBucket: "2026-07-15" },
  ]);
  assert.equal(Number.isFinite(new Date(aligned[0].date).getTime()), true);
});

test("builds transaction handoff without unsupported cashier filter", () => {
  assert.equal(
    transactionHandoff({ dateFrom: "2026-07-01", dateTo: "2026-07-17", paymentMethod: "cash", cashierUserId: "user-1" }),
    "/transactions?dateFrom=2026-07-01&dateTo=2026-07-17&paymentMethod=cash",
  );
  assert.equal(cashierLabel("", "abcdefghijk"), "Pengguna abcdefgh");
  assert.equal(comparisonCopy({ percent: null }), "Tidak ada data pembanding");
  assert.equal(comparisonCopy({ percent: 12.34, direction: "up" }), "Naik 12,3% dari periode sebelumnya");
});

test("downloadBlob always removes the anchor and revokes its object URL", () => {
  const calls = [];
  const anchor = { click: () => calls.push("click"), remove: () => calls.push("remove") };
  const browser = {
    URL: { createObjectURL: () => "blob:test", revokeObjectURL: (url) => calls.push(`revoke:${url}`) },
    document: { createElement: () => anchor, body: { append: () => calls.push("append") } },
  };
  downloadBlob({ blob: new Blob(["csv"]), filename: "report.csv" }, browser);
  assert.equal(anchor.href, "blob:test");
  assert.equal(anchor.download, "report.csv");
  assert.deepEqual(calls, ["append", "click", "remove", "revoke:blob:test"]);
});
