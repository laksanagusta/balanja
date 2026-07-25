import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("floating popovers portal above dialogs and avoid scroll-container clipping", async () => {
  const primitives = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");
  const masterDataSelect = await readFile(new URL("./product/MasterDataSelectField.jsx", import.meta.url), "utf8");
  const stockPage = await readFile(new URL("../pages/StockPage.jsx", import.meta.url), "utf8");

  assert.match(primitives, /createPortal/);
  assert.match(primitives, /fixed z-\[60\]/);
  assert.match(primitives, /window\.addEventListener\("scroll", updatePosition, true\)/);
  assert.match(primitives, /shouldOpenAbove/);
  assert.match(masterDataSelect, /<FloatingPopover/);
  assert.match(stockPage, /<FloatingPopover/);
});
