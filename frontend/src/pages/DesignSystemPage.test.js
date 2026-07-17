import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("design system page includes master data patterns showcase", async () => {
  const source = await readFile(new URL("./DesignSystemPage.jsx", import.meta.url), "utf8");
  assert.match(source, /MasterDataPatternsShowcase/);
});
