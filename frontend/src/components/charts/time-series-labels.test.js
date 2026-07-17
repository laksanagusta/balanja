import test from "node:test";
import assert from "node:assert/strict";
import { resolveTimeSeriesLabels } from "./time-series-labels.js";

const data = [
  { date: "2026-07-17T00:00:00+07:00", label: "00.00" },
  { date: "2026-07-17T06:00:00+07:00", label: "06.00" },
];
const xAccessor = (point) => new Date(point.date);

test("uses explicit time-series display labels without changing x values", () => {
  assert.deepEqual(resolveTimeSeriesLabels(data, xAccessor, "label"), ["00.00", "06.00"]);
});

test("falls back to formatted dates when the display label is absent", () => {
  const labels = resolveTimeSeriesLabels([{ date: "2026-07-17T00:00:00+07:00" }], xAccessor);
  assert.equal(labels.length, 1);
  assert.match(labels[0], /Jul/);
});
