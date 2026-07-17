import { shortDateFmt } from "./chart-formatters.js";

export function resolveTimeSeriesLabels(data, xAccessor, xLabelKey) {
  return data.map((point) => {
    const explicit = xLabelKey ? point?.[xLabelKey] : undefined;
    if (explicit !== undefined && explicit !== null && String(explicit).trim()) {
      return String(explicit);
    }
    return shortDateFmt.format(xAccessor(point));
  });
}
