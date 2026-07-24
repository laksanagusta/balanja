export const settingsTabOrder = ["profile", "categories", "units"];

export function getSettingsTabDirection(previousTab, nextTab) {
  const previousIndex = settingsTabOrder.indexOf(previousTab);
  const nextIndex = settingsTabOrder.indexOf(nextTab);
  if (previousIndex < 0 || nextIndex < 0 || previousIndex === nextIndex) return 0;
  return nextIndex > previousIndex ? 1 : -1;
}
