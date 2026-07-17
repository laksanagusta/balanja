import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("camera stays active after a detection and suppresses duplicate frames", async () => {
  const source = await readFile(new URL("./BarcodeScanner.jsx", import.meta.url), "utf8");
  const detectionCallback = source.slice(source.indexOf("if (result)"), source.indexOf("});", source.indexOf("if (result)")));

  assert.doesNotMatch(detectionCallback, /ctrl\.stop\(\)/);
  assert.match(source, /lastDetectionRef/);
  assert.match(source, /duplicate/);
});

test("manual detection clears the submitted barcode for the next scan", async () => {
  const source = await readFile(new URL("./BarcodeScanner.jsx", import.meta.url), "utf8");
  const submitManual = source.slice(source.indexOf("const submitManual"), source.indexOf("return (", source.indexOf("const submitManual")));

  assert.match(submitManual, /setManualCode\(""\)/);
  assert.match(submitManual, /onDetectedRef\.current\(code\)/);
});

test("scanner uses a forced full-screen surface with Indonesian copy", async () => {
  const source = await readFile(new URL("./BarcodeScanner.jsx", import.meta.url), "utf8");

  assert.match(source, /title = "Pindai barcode"/);
  assert.match(source, /className=\{`fixed inset-0 z-50 bg-black/);
  assert.match(source, /className="relative h-full w-full overflow-hidden bg-black"/);
  assert.doesNotMatch(source, /place-items-center bg-black\/60 p-4/);
  assert.doesNotMatch(source, /className=\{`relative h-full w-full overflow-hidden rounded-\[28px\]/);
  assert.match(source, /Arahkan kamera ke barcode\./);
  assert.match(source, /Masukkan barcode manual/);
});
