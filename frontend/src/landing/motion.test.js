import test from "node:test";
import assert from "node:assert/strict";
import {
  preferredScrollBehavior,
  scrollIntoViewRespectingMotion,
  scrollToSectionRespectingMotion,
  scrollToTopRespectingMotion,
} from "./motion.js";

test("preferredScrollBehavior disables smooth scrolling for reduced motion", () => {
  const matchMedia = () => ({ matches: true });

  assert.equal(preferredScrollBehavior(matchMedia), "auto");
});

test("preferredScrollBehavior keeps smooth scrolling otherwise", () => {
  const matchMedia = () => ({ matches: false });

  assert.equal(preferredScrollBehavior(matchMedia), "smooth");
});

test("scroll helpers pass the preferred behavior to browser APIs", () => {
  const calls = [];
  const matchMedia = () => ({ matches: true });
  const element = { scrollIntoView: (options) => calls.push(["element", options]) };
  const viewport = { scrollTo: (options) => calls.push(["viewport", options]) };

  scrollIntoViewRespectingMotion(element, matchMedia);
  scrollToTopRespectingMotion(viewport, matchMedia);

  assert.deepEqual(calls, [
    ["element", { behavior: "auto" }],
    ["viewport", { top: 0, behavior: "auto" }],
  ]);
});

test("scrollToSectionRespectingMotion lands with the sticky header offset and preferred behavior", () => {
  const calls = [];
  const matchMedia = () => ({ matches: false });
  const element = { getBoundingClientRect: () => ({ top: 500 }) };
  const viewport = { scrollY: 100, scrollTo: (options) => calls.push(options) };

  scrollToSectionRespectingMotion(element, { offset: 96, viewport, matchMedia });

  assert.deepEqual(calls, [{ top: 504, behavior: "smooth" }]);
});

test("scrollToSectionRespectingMotion keeps the reduced-motion jump and never scrolls above the top", () => {
  const calls = [];
  const matchMedia = () => ({ matches: true });
  const element = { getBoundingClientRect: () => ({ top: -40 }) };
  const viewport = { scrollY: 30, scrollTo: (options) => calls.push(options) };

  scrollToSectionRespectingMotion(element, { offset: 96, viewport, matchMedia });

  assert.deepEqual(calls, [{ top: 0, behavior: "auto" }]);
});
