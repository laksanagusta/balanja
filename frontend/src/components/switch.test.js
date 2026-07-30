import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the product success switch uses the lighter control green", async () => {
  const primitives = await readFile(new URL("./primitives.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../index.css", import.meta.url), "utf8");
  const guide = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");

  assert.match(primitives, /tone === "success" \? "bg-success-control"/);
  assert.match(css, /--color-success-control:\s*#34c759/);
  assert.match(guide, /success-control/);
});
