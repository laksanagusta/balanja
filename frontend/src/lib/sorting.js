const collator = new Intl.Collator("id-ID", {
  numeric: true,
  sensitivity: "base",
});

function resolveValue(row, key, config = {}) {
  const accessor = config.accessor ?? key;
  return typeof accessor === "function" ? accessor(row) : row?.[accessor];
}

function normalizeDate(value) {
  if (value instanceof Date) return value.getTime();
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compareValues(aValue, bValue, type = "string") {
  const aMissing = aValue === null || aValue === undefined || aValue === "";
  const bMissing = bValue === null || bValue === undefined || bValue === "";
  if (aMissing || bMissing) {
    if (aMissing && bMissing) return 0;
    return aMissing ? 1 : -1;
  }

  if (type === "number") {
    const aNumber = normalizeNumber(aValue);
    const bNumber = normalizeNumber(bValue);
    if (aNumber === null || bNumber === null) {
      return collator.compare(String(aValue), String(bValue));
    }
    return aNumber - bNumber;
  }

  if (type === "date") {
    const aDate = normalizeDate(aValue);
    const bDate = normalizeDate(bValue);
    if (aDate === null || bDate === null) {
      return collator.compare(String(aValue), String(bValue));
    }
    return aDate - bDate;
  }

  return collator.compare(String(aValue), String(bValue));
}

export function getNextSortState(currentKey, currentDir, nextKey, defaultDir = "asc") {
  if (currentKey === nextKey) {
    return { sortKey: currentKey, sortDir: currentDir === "asc" ? "desc" : "asc" };
  }
  return { sortKey: nextKey, sortDir: defaultDir };
}

export function sortRows(rows, sortKey, sortDir = "asc", sortConfig = {}) {
  const config = sortConfig[sortKey] ?? {};
  const direction = sortDir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const result = compareValues(
      resolveValue(a, sortKey, config),
      resolveValue(b, sortKey, config),
      config.type,
    );
    if (result !== 0) return result * direction;
    return collator.compare(String(a?.id ?? ""), String(b?.id ?? ""));
  });
}
