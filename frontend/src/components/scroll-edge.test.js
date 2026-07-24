import test from "node:test";
import assert from "node:assert/strict";
import { getScrollEdgeState } from "./scroll-edge.js";

test("scroll edge state hides both edges without overflow", () => {
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 0, clientWidth: 480, scrollWidth: 480 }),
    { inlineStart: false, inlineEnd: false },
  );
});

test("scroll edge state reveals only hidden directions", () => {
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 0, clientWidth: 320, scrollWidth: 720 }),
    { inlineStart: false, inlineEnd: true },
  );
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 180, clientWidth: 320, scrollWidth: 720 }),
    { inlineStart: true, inlineEnd: true },
  );
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 400, clientWidth: 320, scrollWidth: 720 }),
    { inlineStart: true, inlineEnd: false },
  );
});

test("scroll edge state tolerates fractional endpoint metrics", () => {
  assert.deepEqual(
    getScrollEdgeState({ scrollLeft: 399.5, clientWidth: 320, scrollWidth: 720 }),
    { inlineStart: true, inlineEnd: false },
  );
});
