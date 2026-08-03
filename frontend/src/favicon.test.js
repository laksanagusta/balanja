import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the document installs the shared SVG favicon", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const favicon = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");
  const softFavicon = await readFile(new URL("../public/favicon-soft.svg", import.meta.url), "utf8");
  const inverseFavicon = await readFile(new URL("../public/favicon-inverse.svg", import.meta.url), "utf8");
  const designGuide = await readFile(new URL("../DESIGN.md", import.meta.url), "utf8");
  const designSystem = await readFile(new URL("./pages/DesignSystemPage.jsx", import.meta.url), "utf8");

  assert.match(html, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml" \/>/);
  assert.match(favicon, /viewBox="0 0 32 32"/);
  assert.match(favicon, /<rect width="32" height="32" rx="8"/);
  assert.match(favicon, /m16 5 11 6-11 6-11-6 11-6Z/);
  assert.match(favicon, /fill="#171717"/);
  assert.match(favicon, /fill="#fff"/);
  assert.match(favicon, /fill="#d4d4d4"/);
  assert.match(favicon, /fill="#8f8f8f"/);
  assert.equal((favicon.match(/<path /g) || []).length, 3);
  assert.equal((softFavicon.match(/<path /g) || []).length, 3);
  assert.equal((inverseFavicon.match(/<path /g) || []).length, 3);
  assert.match(designGuide, /abstract isometric retail volume/);
  assert.match(designGuide, /contains no door, window, letterform, or text/);
  assert.match(designSystem, /Isometric Wipay mark variations/);
  assert.match(designSystem, /src="\/favicon-soft\.svg"/);
  assert.match(designSystem, /src="\/favicon-inverse\.svg"/);
});
