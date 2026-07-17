export function nextSelectIndex(current, length, key) {
  if (length <= 0) return -1;

  const safeIndex = current >= 0 && current < length ? current : 0;
  if (key === "ArrowDown") return (safeIndex + 1) % length;
  if (key === "ArrowUp") return (safeIndex - 1 + length) % length;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return safeIndex;
}
