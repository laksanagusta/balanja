import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("scan result confirmation uses one local Apple-style material", async () => {
  const source = await readFile(new URL("./ScanResultConfirmation.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../../index.css", import.meta.url), "utf8");

  assert.match(source, /scan-result-confirmation/);
  assert.match(source, /feedback\?\.tone === "success"/);
  assert.match(source, /bg-\[#b8f7ce\]/);
  assert.match(source, /bg-\[#ffe59a\]/);
  assert.match(source, /name=\{successful \? "check" : "help"\}/);
  assert.match(source, /product\?\.name/);
  assert.match(source, /formatPrice\(product\.price\)/);
  assert.match(source, /Qty \{product\.quantity\}/);
  assert.match(source, /product\?\.barcode \|\| feedback\?\.description/);
  assert.match(source, /role=\{announce \? "status" : undefined\}/);
  assert.match(css, /\.scan-result-confirmation\s*\{[\s\S]*border-radius:\s*18px/);
  assert.match(css, /background:\s*rgb\(15 15 17 \/ 0\.78\)/);
  assert.match(css, /backdrop-filter:\s*blur\(22px\) saturate\(145%\)/);
  assert.match(css, /\.scan-result-confirmation\[data-visible="true"\][\s\S]*180ms cubic-bezier\(0\.23,\s*1,\s*0\.32,\s*1\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.scan-result-confirmation/);
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\)[\s\S]*\.scan-result-confirmation/);
  assert.match(css, /@media \(prefers-contrast: more\)[\s\S]*\.scan-result-confirmation/);
});
