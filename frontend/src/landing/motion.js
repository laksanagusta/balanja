const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

export function preferredScrollBehavior(matchMedia = globalThis.matchMedia) {
  if (typeof matchMedia !== "function") return "auto";
  return matchMedia(reducedMotionQuery).matches ? "auto" : "smooth";
}

export function scrollIntoViewRespectingMotion(element, matchMedia = globalThis.matchMedia) {
  element?.scrollIntoView({ behavior: preferredScrollBehavior(matchMedia) });
}

export function scrollToTopRespectingMotion(viewport = globalThis, matchMedia = globalThis.matchMedia) {
  viewport.scrollTo({ top: 0, behavior: preferredScrollBehavior(matchMedia) });
}
