import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("login page uses Clerk and links back to the public landing page", async () => {
  const [source, designSystem, designGuide] = await Promise.all([
    readFile(new URL("./LoginPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("./DesignSystemPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../DESIGN.md", import.meta.url), "utf8"),
  ]);

  assert.match(source, /<SignIn/);
  assert.match(source, /routing="hash"/);
  assert.match(source, /fallbackRedirectUrl=\{routes\.dashboard\}/);
  assert.match(source, /signUpFallbackRedirectUrl=\{routes\.dashboard\}/);
  assert.doesNotMatch(source, /afterSignInUrl/);
  assert.doesNotMatch(source, /routes\.landing/);
  assert.doesNotMatch(source, /<header/);
  assert.doesNotMatch(source, /Staff PIN/);
  assert.doesNotMatch(source, /BALANJA-01/);
  assert.match(source, /min-h-dvh/);
  assert.doesNotMatch(source, /min-h-screen|100vh/);
  assert.match(source, /w-full max-w-\[25rem\] min-w-0/);
  assert.match(source, /rootBox:\s*"w-full"/);
  assert.match(source, /cardBox:\s*"w-full max-w-full"/);
  assert.match(source, /card:\s*"w-full max-w-full"/);
  assert.doesNotMatch(source, /rounded-panel border border-border bg-surface p-4 shadow-panel/);
  assert.match(designSystem, /dynamic viewport height/i);
  assert.match(designSystem, /single Clerk card/i);
  assert.match(designGuide, /dynamic viewport height/i);
  assert.match(designGuide, /single Clerk card/i);
});
