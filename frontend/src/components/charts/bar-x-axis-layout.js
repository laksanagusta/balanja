export function getBarXAxisLabelMaxWidth(
  labels,
  { gutter = 8, minWidth = 40, maxWidth = 112 } = {},
) {
  if (labels.length < 2) return maxWidth;

  let nearestCenterSpacing = Number.POSITIVE_INFINITY;
  for (let index = 1; index < labels.length; index += 1) {
    nearestCenterSpacing = Math.min(
      nearestCenterSpacing,
      Math.abs(labels[index].x - labels[index - 1].x),
    );
  }

  return Math.max(minWidth, Math.min(maxWidth, nearestCenterSpacing - gutter));
}
