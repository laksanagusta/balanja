import test from "node:test";
import assert from "node:assert/strict";
import {
  preferredScrollBehavior,
  scrollIntoViewRespectingMotion,
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
