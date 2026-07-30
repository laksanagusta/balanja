import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("app shell keeps the smartphone chrome and caps the canvas at 1200px", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(source, /className="h-svh overflow-hidden bg-app-bg"/);
  assert.match(source, /className="mx-auto flex h-full w-full max-w-\[1200px\] overflow-hidden bg-surface"/);
  assert.doesNotMatch(source, /md:hidden|md:flex|md:p-2|md:gap-2/);
  assert.match(designGuide, /capped at 1200px/);
  assert.match(designGuide, /Do not introduce a desktop sidebar/);
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

test("outer app shell stays shadow-free and has no desktop sidebar", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /<aside/);
  assert.doesNotMatch(source, /max-w-\[1200px\][^"]*shadow-panel/);
  assert.doesNotMatch(source, /<section[^>]+shadow-panel/);
});

test("app shell names the active module while keeping Balanja on home", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.match(source, /\[routes\.dashboard\]: "Balanja"/);
  assert.match(source, /\[routes\.pos\]: "Kasir"/);
  assert.match(source, /\[routes\.products\]: "Produk"/);
  assert.match(source, /\[routes\.stock\]: "Stok"/);
  assert.match(source, /\[routes\.transactions\]: "Transaksi"/);
  assert.match(source, /\[routes\.reportsSales\]: "Laporan Penjualan"/);
  assert.match(source, /\[routes\.settings\]: "Pengaturan"/);
  assert.match(source, /const pageTitle = appPageTitles\[pathname\] \|\| "Balanja"/);
  assert.match(source, /<h1 className="min-w-0 truncate text-lg font-extrabold tracking-normal text-text">/);
  assert.match(source, /\{pageTitle\}/);
  assert.match(source, /mobile-app-bar[^"]*px-4/);
  assert.match(source, /mobilePrimaryNavigation/);
  assert.doesNotMatch(source, /systemNavItems|SystemNavigation/);
  assert.match(source, /aria-current=\{pathname === path \? "page" : undefined\}/);
  assert.doesNotMatch(source, /<Logo/);
});

test("settings lives inside the shared account popover", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /UserButton/);
  assert.match(source, /function AccountMenu/);
  assert.match(source, /go\(routes\.settings\)/);
  assert.match(source, />\s*Pengaturan\s*</);
  assert.doesNotMatch(source, /\bborder-t\b/);
  assert.match(source, /text-danger/);
  assert.match(source, /aria-label="Buka menu akun"/);
});

test("account control stays in the persistent top bar", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.match(source, /<header className="mobile-app-bar/);
  assert.match(source, /id="app-top-bar-actions"/);
  assert.match(source, /aria-label="Buka menu akun"/);
  assert.match(source, /mobile-account-menu absolute right-3/);
  const accountButtonAt = source.indexOf('aria-label="Buka menu akun"');
  const accountButton = source.slice(accountButtonAt, source.indexOf("</button>", accountButtonAt));
  assert.doesNotMatch(accountButton, /border border-border/);
  assert.doesNotMatch(accountButton, /bg-surface-muted|bg-border/);
  assert.match(accountButton, /bg-transparent/);
  assert.doesNotMatch(source, /relative mt-auto|footer/);
});

test("account avatars share the approved four-color glow", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const showcase = await readFile(new URL("./design/NavigationPatternsShowcase.jsx", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.equal(source.match(/className="account-avatar/g)?.length, 1);
  assert.match(showcase, /className="account-avatar size-9/);
  assert.doesNotMatch(showcase, /account-avatar size-9 rounded-full bg-surface-muted/);
  assert.match(css, /--shadow-avatar:\s*0px 23px 60px -15px #7359f299,\s*14px 30px 65px -15px #fa59807d,\s*0px 38px 70px -15px #ffeb4062,\s*-13px 30px 74px -15px #33d9f246;/);
  assert.match(css, /\.account-avatar\s*\{\s*box-shadow:\s*var\(--shadow-avatar\)/);
  assert.match(designGuide, /--shadow-avatar/);
});

test("app shell leaves cart scanning to the cashier workspace", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /BarcodeScanner/);
  assert.doesNotMatch(source, /addToCart/);
  assert.doesNotMatch(source, /scannerOpen/);
});

test("mobile navigation uses a full-bleed top bar and accessible five-item bottom bar", async () => {
  const [source, css, showcase, designGuide] = await Promise.all([
    readFile(new URL("./AppShell.jsx", import.meta.url), "utf8"),
    readFile(new URL("../index.css", import.meta.url), "utf8"),
    readFile(new URL("./design/NavigationPatternsShowcase.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
  ]);

  assert.match(source, /className="mobile-app-bar shrink-0 bg-surface/);
  assert.doesNotMatch(source, /\bborder-b\b/);
  assert.match(source, /aria-label="Navigasi utama mobile"/);
  assert.match(source, /grid-cols-5/);
  for (const label of ["Beranda", "Kasir", "Produk", "Stok", "Lainnya"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /aria-expanded=\{moreOpen\}/);
  assert.match(source, /aria-controls="mobile-more-navigation"/);
  assert.match(source, /id="mobile-more-navigation"/);
  assert.match(source, /aria-label="Tutup navigasi lainnya"/);
  assert.match(source, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(css, /padding-block-start: max\(0\.75rem, env\(safe-area-inset-top, 0px\)\)/);
  assert.match(css, /padding-block-end: max\(0\.5rem, env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(css, /--shadow-navigation:\s*0 -4px 12px rgb\(18 18 18 \/ 0\.05\)/);
  assert.match(css, /\.mobile-bottom-navigation\s*\{[\s\S]*border-block-start:\s*1px solid var\(--color-border\);[\s\S]*box-shadow:\s*var\(--shadow-navigation\)/);
  assert.match(css, /prefers-reduced-transparency/);
  assert.match(showcase, /persistent five-item bottom navigation/);
  assert.match(showcase, /thin top border and restrained upward shadow/);
  assert.match(designGuide, /persistent five-item bottom navigation/);
  assert.match(showcase, /quiet white top bar/i);
  assert.match(designGuide, /white `surface` top bar/i);
});

test("desktop widths never introduce a sidebar or icon rail", async () => {
  const source = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /sidebarCollapsed|<aside|w-\[72px\]|w-\[236px\]/);
  assert.match(source, /mobile-bottom-navigation/);
});

test("legacy panel-left icon is not rendered by the mobile-first shell", async () => {
  const shell = await readFile(new URL("./AppShell.jsx", import.meta.url), "utf8");
  const icons = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");

  assert.match(icons, /function PanelLeftIcon\(\{ className \}\) \{[\s\S]*<rect width="18" height="18" x="3" y="3" rx="2"\s*\/>[\s\S]*<path d="M9 3v18"\s*\/>/);
  assert.match(icons, /sidebar: PanelLeftIcon/);
  assert.doesNotMatch(icons, /sidebar: RectangleStackIcon/);
  assert.doesNotMatch(shell, /<Icon name="sidebar"/);
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
  assert.match(shell, /\["Produk", "box", routes\.products\]/);
  assert.match(shell, /\["Stok", "package", routes\.stock\]/);
  assert.match(showcase, /smartphone information architecture/);
  assert.match(designGuide, /Produk route uses a tag icon while Stok uses an archive-box icon/);
});
