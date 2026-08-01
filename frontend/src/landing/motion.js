const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

export function preferredScrollBehavior(matchMedia = globalThis.matchMedia) {
  if (typeof matchMedia !== "function") return "auto";
  return matchMedia(reducedMotionQuery).matches ? "auto" : "smooth";
}

export function scrollIntoViewRespectingMotion(element, matchMedia = globalThis.matchMedia) {
  element?.scrollIntoView({ behavior: preferredScrollBehavior(matchMedia) });
}

export function scrollToSectionRespectingMotion(
  element,
  { offset = 96, viewport = globalThis.window, matchMedia = globalThis.matchMedia } = {},
) {
  if (!element || !viewport) return;
  const top = Math.max(element.getBoundingClientRect().top + viewport.scrollY - offset, 0);
  viewport.scrollTo({ top, behavior: preferredScrollBehavior(matchMedia) });
}

export function scrollToTopRespectingMotion(viewport = globalThis, matchMedia = globalThis.matchMedia) {
  viewport.scrollTo({ top: 0, behavior: preferredScrollBehavior(matchMedia) });
}
