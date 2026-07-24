import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("settings navigation adapts from horizontal tabs to a vertical rail", async () => {
  const source = await readFile(new URL("./SettingsNavigation.jsx", import.meta.url), "utf8");
  assert.match(source, /aria-label="Navigasi pengaturan"/);
  assert.match(source, /aria-current=\{activeId === item\.id \? "page" : undefined\}/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /md:grid/);
  assert.match(source, /min-h-11/);
  assert.doesNotMatch(source, /isMobile|isDesktop|vertical=/);
});
