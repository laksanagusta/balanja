import test from "node:test";
import assert from "node:assert/strict";
import { initialCursorState, moveNext, movePrevious, pageRange, resetCursorState } from "./cursor-pagination.js";

test("next and previous retain visited cursors", () => {
  let state = initialCursorState();
  state = moveNext(state, "cursor-2");
  assert.equal(state.cursor, "cursor-2");
  assert.deepEqual(state.previous, [""]);

  state = movePrevious(state);
  assert.equal(state.cursor, "");
  assert.deepEqual(state.previous, []);
});

test("reset clears cursor history", () => {
  const state = resetCursorState({ cursor: "cursor-3", previous: ["", "cursor-2"] });
  assert.deepEqual(state, { cursor: "", previous: [] });
});

test("page range is derived without claiming an exact total", () => {
  assert.deepEqual(pageRange(0, 20, 0), { start: 0, end: 0, page: 1 });
  assert.deepEqual(pageRange(2, 20, 7), { start: 41, end: 47, page: 3 });
});
