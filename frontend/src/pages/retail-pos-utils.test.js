import test from "node:test";
import assert from "node:assert/strict";
import { cashPaymentState } from "./retail-pos-utils.js";
import * as retailPosUtils from "./retail-pos-utils.js";

test("cash payment rejects empty and malformed amounts", () => {
  assert.equal(cashPaymentState("", 5000, 1).valid, false);
  assert.deepEqual(cashPaymentState("abc", 5000, 1), {
    amount: Number.NaN,
    valid: false,
    error: "Masukkan nominal tunai yang valid.",
    showChange: false,
    change: 0,
    showShortfall: false,
    shortfall: 0,
  });
  assert.equal(cashPaymentState("Infinity", 5000, 1).valid, false);
});

test("cash payment rejects insufficient cash", () => {
  const state = cashPaymentState("4000", 5000, 1);
  assert.equal(state.valid, false);
  assert.equal(state.error, "Nominal tunai harus menutup total akhir.");
  assert.equal(state.showShortfall, true);
  assert.equal(state.shortfall, 1000);
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
    showShortfall: false,
    shortfall: 0,
  });
});

test("cart downward swipe dismissal uses distance or forward velocity", () => {
  assert.equal(typeof retailPosUtils.shouldDismissCartSwipe, "function");
  assert.equal(retailPosUtils.shouldDismissCartSwipe({ distance: 130, velocity: 0.1, dimension: 800 }), true);
  assert.equal(retailPosUtils.shouldDismissCartSwipe({ distance: 24, velocity: 0.6, dimension: 800 }), true);
  assert.equal(retailPosUtils.shouldDismissCartSwipe({ distance: 24, velocity: -0.6, dimension: 800 }), false);
  assert.equal(retailPosUtils.shouldDismissCartSwipe({ distance: 24, velocity: 0.1, dimension: 800 }), false);
});

test("cart swipe resistance softens movement past the open boundary", () => {
  assert.equal(typeof retailPosUtils.resistedCartSwipeDistance, "function");
  assert.equal(retailPosUtils.resistedCartSwipeDistance(80, 360), 80);
  const resisted = retailPosUtils.resistedCartSwipeDistance(-80, 360);
  assert.ok(resisted < 0);
  assert.ok(Math.abs(resisted) < 80);
});

test("cart swipe velocity uses recent pointer history and decays after a hold", () => {
  assert.equal(
    retailPosUtils.cartSwipeVelocity([
      { y: 0, time: 0 },
      { y: 30, time: 50 },
    ]),
    600,
  );
  assert.equal(
    retailPosUtils.cartSwipeVelocity([
      { y: 0, time: 0 },
      { y: 30, time: 50 },
      { y: 30, time: 200 },
    ]),
    0,
  );
});

test("cart translation rubber-bands beyond both open and closed edges", () => {
  const beforeOpen = retailPosUtils.resistedCartTranslation(-80, 360);
  const pastClosed = retailPosUtils.resistedCartTranslation(440, 360);
  assert.ok(beforeOpen < 0 && Math.abs(beforeOpen) < 80);
  assert.ok(pastClosed > 360 && pastClosed < 440);
});

test("cart focus candidates exclude mounted inert descendants", () => {
  const visible = {
    closest: () => null,
    getClientRects: () => [{ width: 44, height: 44 }],
  };
  const inert = {
    closest: (selector) => (selector.includes("[inert]") ? {} : null),
    getClientRects: () => [{ width: 44, height: 44 }],
  };
  assert.equal(retailPosUtils.isCartFocusCandidate(visible), true);
  assert.equal(retailPosUtils.isCartFocusCandidate(inert), false);
});
