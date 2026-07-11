import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard owns a full-height scrolling container inside the app shell", async () => {
  const source = await readFile(new URL("./DashboardPage.jsx", import.meta.url), "utf8");

  assert.match(source, /className="h-full overflow-auto bg-app-bg"/);
  assert.doesNotMatch(source, /className="min-h-full overflow-auto bg-app-bg"/);
});

test("dashboard requests server-side analytics", async () => {
  const source = await readFile(new URL("./DashboardPage.jsx", import.meta.url), "utf8");

  assert.match(source, /getDashboardSummary/);
  assert.doesNotMatch(source, /buildDashboardAnalytics/);
});
