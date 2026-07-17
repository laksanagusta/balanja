import test from "node:test";
import assert from "node:assert/strict";
import { localizedTrendTitle } from "./trend-tooltip-title.js";

test("formats hourly report points with WIB date and hour", () => {
  assert.equal(localizedTrendTitle({
    date: "2026-07-17T14:00:00+07:00",
    label: "14.00",
    currentBucket: "2026-07-17T14:00:00+07:00",
  }), "17 Jul · 14.00");
});

test("formats daily points as a localized full date", () => {
  assert.match(localizedTrendTitle({ date: "2026-07-17" }), /Jumat, 17 Jul/);
});

test("falls back to the display label for an invalid date", () => {
  assert.equal(localizedTrendTitle({ date: "invalid", label: "Saat ini" }), "Saat ini");
});
