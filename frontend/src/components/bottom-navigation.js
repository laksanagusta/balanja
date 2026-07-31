export const bottomNavigationCollapseDistance = 72;

export function releaseBottomNavigationPointerFocus(event) {
  if (event?.detail > 0) event.currentTarget?.blur?.();
}

export function seedBottomNavigationScrollPositions(scrollRegions, scrollPositions) {
  let isScrolledAway = false;

  for (const scrollRegion of scrollRegions) {
    const scrollTop = Number.isFinite(scrollRegion?.scrollTop)
      ? Math.max(0, scrollRegion.scrollTop)
      : 0;
    scrollPositions.set(scrollRegion, scrollTop);
    if (scrollTop > 4 && scrollRegion.scrollHeight > scrollRegion.clientHeight + 1) {
      isScrolledAway = true;
    }
  }

  return isScrolledAway;
}

export function nextBottomNavigationProgress({
  progress,
  delta,
  scrollTop,
  collapseDistance = bottomNavigationCollapseDistance,
}) {
  if (scrollTop <= 4) return 0;
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) return progress;

  return Math.min(1, Math.max(0, progress + delta / collapseDistance));
}
