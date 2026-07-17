import test from "node:test";
import assert from "node:assert/strict";
import { nextSelectIndex } from "./select-field-navigation.js";

test("select navigation wraps through options and supports boundaries", () => {
  assert.equal(nextSelectIndex(0, 3, "ArrowDown"), 1);
  assert.equal(nextSelectIndex(2, 3, "ArrowDown"), 0);
  assert.equal(nextSelectIndex(0, 3, "ArrowUp"), 2);
  assert.equal(nextSelectIndex(1, 3, "Home"), 0);
  assert.equal(nextSelectIndex(1, 3, "End"), 2);
});

test("select navigation is safe for empty and unknown input", () => {
  assert.equal(nextSelectIndex(0, 0, "ArrowDown"), -1);
  assert.equal(nextSelectIndex(1, 3, "Tab"), 1);
});
