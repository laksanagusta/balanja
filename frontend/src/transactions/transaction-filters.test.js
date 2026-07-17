import test from "node:test";
import assert from "node:assert/strict";
import { dateBoundaryWIB, readTransactionFilters } from "./transaction-filters.js";

test("reads supported report handoff filters", () => {
  assert.deepEqual(readTransactionFilters("?dateFrom=2026-07-01&dateTo=2026-07-17&paymentMethod=cash&cashierUserId=ignored"), {
    paymentMethod: "cash",
    dateFrom: "2026-07-01",
    dateTo: "2026-07-17",
  });
  assert.equal(readTransactionFilters("?paymentMethod=card").paymentMethod, "");
});

test("builds explicit WIB transaction boundaries", () => {
  assert.equal(dateBoundaryWIB("2026-07-01"), "2026-06-30T17:00:00.000Z");
  assert.equal(dateBoundaryWIB("2026-07-17", true), "2026-07-17T16:59:59.999Z");
});
