export function sortMasterData(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) =>
    left.name.localeCompare(right.name, "id", { sensitivity: "base" }) || left.id.localeCompare(right.id));
}

export function activeMasterOptions(items, currentId = "") {
  return sortMasterData(items)
    .filter((item) => item.active || item.id === currentId)
    .map((item) => ({
      value: item.id,
      label: `${item.name}${item.active ? "" : " (Diarsipkan)"}`,
      archived: !item.active,
    }));
}

export function resolveMasterName(items, id, fallback = "") {
  return items.find((item) => item.id === id)?.name || fallback;
}
