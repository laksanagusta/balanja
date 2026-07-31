import test from "node:test";
import assert from "node:assert/strict";
import {
  nextBottomNavigationProgress,
  releaseBottomNavigationPointerFocus,
  seedBottomNavigationScrollPositions,
} from "./bottom-navigation.js";

test("bottom navigation progressively collapses while scrolling down", () => {
  assert.equal(nextBottomNavigationProgress({ progress: 0, delta: 18, scrollTop: 18 }), 0.25);
  assert.equal(nextBottomNavigationProgress({ progress: 0.75, delta: 36, scrollTop: 90 }), 1);
});

test("bottom navigation progressively returns while scrolling up", () => {
  assert.equal(nextBottomNavigationProgress({ progress: 1, delta: -18, scrollTop: 90 }), 0.75);
  assert.equal(nextBottomNavigationProgress({ progress: 0.25, delta: -36, scrollTop: 54 }), 0);
});

test("bottom navigation is always visible at the top of a scroll region", () => {
  assert.equal(nextBottomNavigationProgress({ progress: 1, delta: 10, scrollTop: 4 }), 0);
});

test("a newly mounted page scroller is seeded before its first downward scroll", () => {
  const scrollPositions = new WeakMap();
  const pageScroller = { scrollTop: 0, scrollHeight: 800, clientHeight: 400 };

  assert.equal(seedBottomNavigationScrollPositions([pageScroller], scrollPositions), false);

  pageScroller.scrollTop = 18;
  const previousScrollTop = scrollPositions.get(pageScroller);
  const progress = nextBottomNavigationProgress({
    progress: 0,
    delta: pageScroller.scrollTop - previousScrollTop,
    scrollTop: pageScroller.scrollTop,
  });

  assert.equal(progress, 0.25);
});

test("pointer navigation releases stale focus while keyboard navigation retains it", () => {
  let blurCount = 0;
  const currentTarget = { blur: () => { blurCount += 1; } };

  releaseBottomNavigationPointerFocus({ detail: 1, currentTarget });
  assert.equal(blurCount, 1);

  releaseBottomNavigationPointerFocus({ detail: 0, currentTarget });
  assert.equal(blurCount, 1);
});
