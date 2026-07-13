import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("app shell keeps a consistent inset on every outer edge", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.match(source, /className="h-svh overflow-hidden bg-app-bg p-2"/);
  assert.doesNotMatch(source, /className="h-svh overflow-hidden bg-app-bg px-2 pt-2"/);
});

test("app shell does not cast a shadow through the sidebar-content gap", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.match(source, /className="flex h-full gap-2 overflow-hidden"/);
  assert.doesNotMatch(source, /className="flex h-full gap-2 overflow-hidden[^"]*shadow-panel/);
  assert.doesNotMatch(source, /<aside[^>]+shadow-panel/);
  assert.doesNotMatch(source, /<section[^>]+shadow-panel/);
});
