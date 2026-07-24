import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("app shell keeps a consistent inset on every outer edge", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.match(source, /className="h-svh overflow-hidden bg-app-bg p-2"/);
  assert.doesNotMatch(source, /className="h-svh overflow-hidden bg-app-bg px-2 pt-2"/);
});

test("app shell locks document scrolling while pages own internal scroll", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const showcase = await readFile(new URL("./design/NavigationPatternsShowcase.jsx", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(source, /const appShellScrollLockClass = "app-shell-scroll-lock";/);
  assert.match(source, /document\.documentElement\.classList\.add\(appShellScrollLockClass\)/);
  assert.match(source, /document\.body\.classList\.add\(appShellScrollLockClass\)/);
  assert.match(source, /document\.documentElement\.classList\.remove\(appShellScrollLockClass\)/);
  assert.match(source, /document\.body\.classList\.remove\(appShellScrollLockClass\)/);
  assert.match(css, /html\.app-shell-scroll-lock,\s*body\.app-shell-scroll-lock\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(showcase, /document scrolling is locked/i);
  assert.match(designGuide, /document scrolling is locked/i);
  assert.match(designGuide, /internal scroller/i);
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

test("desktop sidebar collapses to an accessible icon rail", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.match(source, /const \[sidebarCollapsed, setSidebarCollapsed\]/);
  assert.match(source, /sidebarCollapsed \? "w-\[72px\]" : "w-\[236px\]"/);
  assert.match(source, /aria-label=\{sidebarCollapsed \? "Perluas sidebar" : "Ciutkan sidebar"\}/);
  assert.match(source, /aria-expanded=\{!sidebarCollapsed\}/);
  assert.match(source, /aria-label=\{collapsed \? label : undefined\}/);
  assert.match(source, /title=\{collapsed \? label : undefined\}/);
});

test("sidebar collapse uses the supplied panel-left icon", async () => {
  const shell = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");
  const icons = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("./design/NavigationPatternsShowcase.jsx", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(icons, /function PanelLeftIcon\(\{ className \}\) \{[\s\S]*<rect width="18" height="18" x="3" y="3" rx="2"\s*\/>[\s\S]*<path d="M9 3v18"\s*\/>/);
  assert.match(icons, /sidebar: PanelLeftIcon/);
  assert.doesNotMatch(icons, /sidebar: RectangleStackIcon/);
  assert.match(shell, /<Icon name="sidebar" className=\{`size-4 transition-transform/);
  assert.match(showcase, /16px panel-left icon/i);
  assert.match(designGuide, /16px panel-left icon/i);
});

test("shared Heroicons keep product and stock distinct in navigation", async () => {
  const shell = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");
  const icons = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");
  const showcase = await readFile(new URL("./design/NavigationPatternsShowcase.jsx", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(icons, /from "@heroicons\/react\/24\/outline"/);
  assert.match(icons, /box: TagIcon/);
  assert.match(icons, /package: ArchiveBoxIcon/);
  assert.doesNotMatch(shell, /function navIcon/);
  assert.match(showcase, /Produk uses the tag icon while Stok uses the archive-box icon/);
  assert.match(designGuide, /Produk route uses a tag icon while Stok uses an archive-box icon/);
});
