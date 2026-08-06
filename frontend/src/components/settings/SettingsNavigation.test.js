import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("settings navigation remains an overflow-safe horizontal tab row", async () => {
  const source = await readFile(new URL("./SettingsNavigation.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");
  assert.match(source, /aria-label="Navigasi pengaturan"/);
  assert.match(source, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(source, /<a/);
  assert.match(source, /href=\{item\.href\}/);
  assert.doesNotMatch(source, /data-href/);
  assert.match(source, /className="settings-navigation"/);
  assert.match(source, /settings-navigation-item/);
  assert.match(source, /scrollWidth > navigation\.clientWidth/);
  assert.match(source, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/);
  assert.doesNotMatch(source, /md:grid|md:w-full/);
  assert.match(css, /\.settings-navigation\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.doesNotMatch(css, /@container settings-workspace \(min-width:\s*760px\)/);
  assert.match(css, /\.settings-navigation-item\s*\{[\s\S]*min-block-size:\s*2\.75rem/);
  assert.doesNotMatch(source, /isMobile|isDesktop|vertical=/);
});
