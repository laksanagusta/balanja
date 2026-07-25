import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  readScanSoundEnabled,
  SCAN_SOUND_STORAGE_KEY,
  writeScanSoundEnabled,
} from "./scan-feedback.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("scan sound preference defaults on and persists an explicit choice", () => {
  const storage = memoryStorage();
  assert.equal(readScanSoundEnabled(storage), true);
  assert.equal(writeScanSoundEnabled(false, storage), false);
  assert.equal(storage.getItem(SCAN_SOUND_STORAGE_KEY), "false");
  assert.equal(readScanSoundEnabled(storage), false);
});

test("scan success sound is subtle, reusable, and reduced-motion aware", async () => {
  const source = await readFile(new URL("./scan-feedback.js", import.meta.url), "utf8");
  assert.match(source, /let audioContext = null/);
  assert.match(source, /context\.state === "suspended"/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /gain\.gain\.setValueAtTime\(0\.12/);
  assert.match(source, /exponentialRampToValueAtTime\(0\.001/);
  assert.match(source, /oscillator\.disconnect\(\)/);
  assert.match(source, /gain\.disconnect\(\)/);
});
