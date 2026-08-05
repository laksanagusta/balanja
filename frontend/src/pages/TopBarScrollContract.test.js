import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("page top bars remain in normal flow instead of using sticky positioning", async () => {
  const [landing, designSystem, products, editor] = await Promise.all([
    readFile(new URL("./LandingPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("./DesignSystemPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("./ProductsPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../components/product/ProductEditorWorkspace.jsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(landing, /public-header[^\"]*\bsticky\b/);
  assert.doesNotMatch(designSystem, /<header[^>]+\bsticky\b/);
  assert.doesNotMatch(products, /<header[^>]+\bsticky\b/);
  assert.doesNotMatch(editor, /<header[^>]+\bsticky\b/);
});
