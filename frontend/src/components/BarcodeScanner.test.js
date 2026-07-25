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
  assert.match(submitManual, /processDetection\(code\)/);
});

test("scanner communicates processing and blocks overlapping detections", async () => {
  const source = await readFile(new URL("./BarcodeScanner.jsx", import.meta.url), "utf8");

  assert.match(source, /const MIN_PROCESSING_MS = 180/);
  assert.match(source, /if \(processingRef\.current\) return/);
  assert.match(source, /await onDetectedRef\.current\?\.\(code\)/);
  assert.match(source, /aria-busy=\{processing\}/);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /Memproses barcode…/);
  assert.match(source, /disabled=\{processing\}/);
  assert.match(source, /name="loader"/);
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

test("scanner requests a useful rear-camera stream instead of browser defaults", async () => {
  const source = await readFile(new URL("./BarcodeScanner.jsx", import.meta.url), "utf8");

  assert.match(source, /decodeFromConstraints\(SCANNER_CAMERA_CONSTRAINTS/);
  assert.doesNotMatch(source, /decodeFromVideoDevice\(undefined/);
  assert.match(source, /facingMode:\s*\{\s*ideal:\s*"environment"\s*\}/);
  assert.match(source, /width:\s*\{\s*ideal:\s*1280\s*\}/);
  assert.match(source, /height:\s*\{\s*ideal:\s*720\s*\}/);
  assert.match(source, /advanced:\s*\[\{\s*focusMode:\s*"continuous"\s*\}\]/);
});

test("scanner exposes actionable camera startup errors", async () => {
  const source = await readFile(new URL("./BarcodeScanner.jsx", import.meta.url), "utf8");

  assert.match(source, /cameraErrorMessage/);
  assert.match(source, /NotAllowedError/);
  assert.match(source, /NotFoundError/);
  assert.match(source, /NotReadableError/);
  assert.match(source, /window\.isSecureContext/);
});
