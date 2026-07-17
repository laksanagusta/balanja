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

test("app shell uses dashboard as home and renders grouped localized navigation", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.match(source, /go\(routes\.dashboard\)/);
  assert.match(source, /group\.label/);
  assert.doesNotMatch(source, /systemNavItems|SystemNavigation/);
  assert.match(source, /aria-current=\{pathname === path \? "page" : undefined\}/);
});

test("settings lives inside the shared account popover", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /UserButton/);
  assert.match(source, /function AccountMenu/);
  assert.match(source, /go\(routes\.settings\)/);
  assert.match(source, />\s*Pengaturan\s*</);
  assert.match(source, /border-t border-border/);
  assert.match(source, /text-danger/);
  assert.match(source, /aria-label="Buka menu akun"/);
});

test("desktop account control owns its separation without a footer divider", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.match(source, /className="relative mt-auto p-3"/);
  assert.doesNotMatch(source, /className="relative mt-auto border-t/);
  assert.match(source, /rounded-control border border-border bg-surface[^"`]*shadow-low/);
});

test("app shell leaves cart scanning to the cashier workspace", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /BarcodeScanner/);
  assert.doesNotMatch(source, /addToCart/);
  assert.doesNotMatch(source, /scannerOpen/);
});

test("mobile navigation is an accessible overlay with neutral selection", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.match(source, /aria-label="Buka menu navigasi"/);
  assert.match(source, /aria-expanded=\{mobileNavOpen\}/);
  assert.match(source, /aria-controls="mobile-navigation"/);
  assert.match(source, /id="mobile-navigation"/);
  assert.match(source, /aria-label="Navigasi aplikasi"/);
  assert.match(source, /aria-label="Tutup menu navigasi"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.doesNotMatch(source, /variant=\{pathname === path \? "primary"/);
});
