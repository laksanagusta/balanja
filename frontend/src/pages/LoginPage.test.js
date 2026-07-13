import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("login page uses Clerk and links back to the public landing page", async () => {
  const source = await readFile(new URL("./LoginPage.jsx", import.meta.url), "utf8");

  assert.match(source, /<SignIn/);
  assert.match(source, /routing="hash"/);
  assert.match(source, /afterSignInUrl=\{routes\.dashboard\}/);
  assert.match(source, /onNavigate\(routes\.landing\)/);
  assert.doesNotMatch(source, /Staff PIN/);
  assert.doesNotMatch(source, /BALANJA-01/);
});
