import test from "node:test";
import assert from "node:assert/strict";
import { cashPaymentState } from "./retail-pos-utils.js";

test("cash payment rejects empty and malformed amounts", () => {
  assert.equal(cashPaymentState("", 5000, 1).valid, false);
  assert.deepEqual(cashPaymentState("abc", 5000, 1), {
    amount: Number.NaN,
    valid: false,
    error: "Masukkan nominal tunai yang valid.",
    showChange: false,
    change: 0,
  });
  assert.equal(cashPaymentState("Infinity", 5000, 1).valid, false);
});

test("cash payment rejects insufficient cash", () => {
  const state = cashPaymentState("4000", 5000, 1);
  assert.equal(state.valid, false);
  assert.equal(state.error, "Nominal tunai harus menutup total akhir.");
});

test("change is visible only for a non-empty cart with sufficient cash", () => {
  assert.equal(cashPaymentState("", 0, 0).showChange, false);
  assert.equal(cashPaymentState("5000", 0, 0).showChange, false);
  assert.deepEqual(cashPaymentState("7000", 5000, 1), {
    amount: 7000,
    valid: true,
    error: "",
    showChange: true,
    change: 2000,
  });
});
