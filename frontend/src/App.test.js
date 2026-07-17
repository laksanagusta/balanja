import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("app waits for Clerk before deciding whether to render the landing page", async () => {
  const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");
  const loadingGuard = source.indexOf("if (!isLoaded)");
  const landingGuard = source.indexOf("if (pathname === routes.landing)");

  assert.ok(loadingGuard >= 0);
  assert.ok(landingGuard >= 0);
  assert.ok(loadingGuard < landingGuard);
});
