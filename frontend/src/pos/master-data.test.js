import test from "node:test";
import assert from "node:assert/strict";
import { activeMasterOptions, resolveMasterName, sortMasterData } from "./master-data.js";

test("activeMasterOptions sorts active records and retains current archived value", () => {
  const items = [{ id: "b", name: "Snack", active: true }, { id: "a", name: "Lama", active: false }];
  assert.deepEqual(activeMasterOptions(items, "a"), [
    { value: "a", label: "Lama (Diarsipkan)", archived: true },
    { value: "b", label: "Snack", archived: false },
  ]);
});

test("sortMasterData orders case-insensitively then by id", () => {
  assert.deepEqual(sortMasterData([
    { id: "b", name: "snack" },
    { id: "a", name: "Snack" },
    { id: "c", name: "Air" },
  ]).map((item) => item.id), ["c", "a", "b"]);
});

test("resolveMasterName returns fallback for missing values", () => {
  assert.equal(resolveMasterName([{ id: "u1", name: "pcs" }], "u1", ""), "pcs");
  assert.equal(resolveMasterName([{ id: "u1", name: "pcs" }], "u2", "Unknown"), "Unknown");
});
