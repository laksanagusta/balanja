import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

test("frontend has no direct Supabase runtime access", async () => {
  const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const ownPath = fileURLToPath(import.meta.url);
  const files = await sourceFiles(sourceRoot);
  const forbidden = ["@supabase/" + "supabase-js", "supabase" + ".from", "supabase" + ".rpc", "functions/" + "v1", "postgres_" + "changes", ".channel" + "("];
  const violations = [];

  for (const file of files) {
    if (file === ownPath) continue;
    const content = await readFile(file, "utf8");
    for (const pattern of forbidden) {
      if (content.includes(pattern)) violations.push(`${path.relative(sourceRoot, file)}: ${pattern}`);
    }
  }
  assert.deepEqual(violations, []);
});

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.[jt]sx?$/.test(entry.name) ? [target] : [];
  }));
  return nested.flat();
}
