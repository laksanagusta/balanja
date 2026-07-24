import test from "node:test";
import assert from "node:assert/strict";
import { getSettingsTabDirection, settingsTabOrder } from "./settings-motion.js";

test("settings tab direction follows the stable workspace order", () => {
  assert.deepEqual(settingsTabOrder, ["profile", "categories", "units"]);
  assert.equal(getSettingsTabDirection("profile", "categories"), 1);
  assert.equal(getSettingsTabDirection("profile", "units"), 1);
  assert.equal(getSettingsTabDirection("units", "categories"), -1);
  assert.equal(getSettingsTabDirection("units", "profile"), -1);
});

test("settings tab direction stays neutral for unchanged or unknown tabs", () => {
  assert.equal(getSettingsTabDirection("categories", "categories"), 0);
  assert.equal(getSettingsTabDirection("unknown", "profile"), 0);
  assert.equal(getSettingsTabDirection("profile", "unknown"), 0);
});
