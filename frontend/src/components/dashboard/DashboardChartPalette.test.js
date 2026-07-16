import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard charts use the approved balanced vivid semantic palette", async () => {
  const styles = await readFile(new URL("../../index.css", import.meta.url), "utf8");
  const charts = await readFile(new URL("./DashboardCharts.jsx", import.meta.url), "utf8");

  assert.match(styles, /--color-chart-violet: #7867e6;/i);
  assert.match(styles, /--color-chart-green: #36a875;/i);
  assert.match(styles, /--color-chart-mint: #5bbf9a;/i);
  assert.match(styles, /--color-chart-amber: #e7a83e;/i);

  assert.match(styles, /--color-chart-cash: var\(--color-chart-violet\);/);
  assert.match(styles, /--color-chart-qris: var\(--color-chart-mint\);/);
  assert.match(styles, /--color-chart-other: var\(--color-chart-amber\);/);
  assert.match(styles, /--chart-line-primary: var\(--color-chart-violet\);/);
  assert.match(styles, /--chart-bar-primary: var\(--color-chart-green\);/);

  assert.match(charts, /stroke="var\(--chart-line-primary\)"/);
  assert.match(charts, /fill="var\(--chart-bar-primary\)"/);
  assert.doesNotMatch(charts, /#[0-9a-f]{6}/i);
});

test("design-system inventory exposes every dashboard chart color", async () => {
  const tokens = await readFile(new URL("../../data.js", import.meta.url), "utf8");

  assert.match(tokens, /\["Chart Violet", "--color-chart-violet", "#7867E6"\]/);
  assert.match(tokens, /\["Chart Green", "--color-chart-green", "#36A875"\]/);
  assert.match(tokens, /\["Chart Mint", "--color-chart-mint", "#5BBF9A"\]/);
  assert.match(tokens, /\["Chart Amber", "--color-chart-amber", "#E7A83E"\]/);
});
