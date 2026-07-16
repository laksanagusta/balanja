import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getBarXAxisLabelMaxWidth } from "./bar-x-axis-layout.js";

test("compact bar labels fit within the nearest center spacing", () => {
  const labels = [{ x: 28 }, { x: 86 }, { x: 144 }, { x: 202 }, { x: 260 }];

  assert.equal(getBarXAxisLabelMaxWidth(labels), 50);
});

test("wide bar labels keep a readable maximum width", () => {
  const labels = [{ x: 120 }, { x: 360 }, { x: 600 }];

  assert.equal(getBarXAxisLabelMaxWidth(labels), 112);
});

test("bar labels use an explicit truncation width inside the zero-width centering container", async () => {
  const source = await readFile(new URL("./bar-x-axis.jsx", import.meta.url), "utf8");

  assert.match(source, /style=\{\{ width: labelMaxWidth \}\}/);
  assert.match(source, /shrink-0 overflow-hidden text-ellipsis whitespace-nowrap/);
});
