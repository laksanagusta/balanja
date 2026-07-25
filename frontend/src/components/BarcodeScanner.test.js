import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("camera stays active and applies a deterministic cooldown to repeated codes", async () => {
  const source = await readFile(new URL("./BarcodeScanner.jsx", import.meta.url), "utf8");
  const detectionCallback = source.slice(source.indexOf("if (result)"), source.indexOf("});", source.indexOf("if (result)")));

  assert.doesNotMatch(detectionCallback, /ctrl\.stop\(\)/);
  assert.match(source, /const SAME_CODE_COOLDOWN_MS = 1000/);
  assert.match(source, /lastDetectionRef/);
  assert.match(source, /repeatedTooSoon/);
  assert.match(source, /now - lastDetectionRef\.current\.acceptedAt < SAME_CODE_COOLDOWN_MS/);
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
  assert.match(source, /role="status"[\s\S]*aria-live="polite"/);
  assert.match(source, /Memproses barcode…/);
  assert.match(source, /disabled=\{processing\}/);
  assert.match(source, /name="loader"/);
  assert.match(source, /setFeedback\(\{ \.\.\.outcome, tone: outcome\.ok \? "success" : "error" \}\)/);
  assert.match(source, /playScanSuccessSound/);
  assert.match(source, /ScanResultConfirmation/);
  assert.match(source, /const RESULT_HOLD_MS = 900/);
  assert.match(source, /const RESULT_EXIT_MS = 140/);
  assert.match(source, /setFeedbackVisible\(false\)/);
  assert.doesNotMatch(source, /from "sonner"|toast\.(success|error)/);
});

test("scanner uses a forced full-screen surface with Indonesian copy", async () => {
  const source = await readFile(new URL("./BarcodeScanner.jsx", import.meta.url), "utf8");

  assert.match(source, /title = "Pindai barcode"/);
  assert.match(source, /className=\{`fixed inset-0 z-50 bg-black/);
  assert.match(source, /className="relative h-full w-full overflow-hidden bg-black"/);
  assert.doesNotMatch(source, /place-items-center bg-black\/60 p-4/);
  assert.doesNotMatch(source, /className=\{`relative h-full w-full overflow-hidden rounded-\[28px\]/);
  assert.doesNotMatch(source, /h-\[min\(48vw,21rem\)\]/);
  assert.match(source, /Arahkan kamera ke barcode\./);
  assert.match(source, /Masukkan barcode manual/);
  assert.match(source, /aria-label="Selesai memindai"/);
  assert.match(source, />\s*Selesai\s*</);
  assert.match(source, /min-h-11/);
  assert.doesNotMatch(source, /aria-label="Tutup pemindai"/);
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
