const EDGE_TOLERANCE = 1;

export function getScrollEdgeState(
  { scrollLeft = 0, clientWidth = 0, scrollWidth = 0 },
  tolerance = EDGE_TOLERANCE,
) {
  const hasOverflow = scrollWidth - clientWidth > tolerance;
  if (!hasOverflow) {
    return { inlineStart: false, inlineEnd: false };
  }

  return {
    inlineStart: scrollLeft > tolerance,
    inlineEnd: scrollLeft + clientWidth < scrollWidth - tolerance,
  };
}
