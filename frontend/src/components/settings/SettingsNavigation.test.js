import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("settings navigation adapts from horizontal tabs to a vertical rail", async () => {
  const source = await readFile(new URL("./SettingsNavigation.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");
  assert.match(source, /aria-label="Navigasi pengaturan"/);
  assert.match(source, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(source, /className="settings-navigation"/);
  assert.match(source, /settings-navigation-item/);
  assert.match(source, /scrollWidth > navigation\.clientWidth/);
  assert.match(source, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/);
  assert.doesNotMatch(source, /md:grid|md:w-full/);
  assert.match(css, /\.settings-navigation\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /@container settings-workspace \(min-width:\s*760px\)[\s\S]*\.settings-navigation\s*\{[\s\S]*display:\s*grid/);
  assert.match(css, /\.settings-navigation-item\s*\{[\s\S]*min-block-size:\s*2\.75rem/);
  assert.doesNotMatch(source, /isMobile|isDesktop|vertical=/);
});
