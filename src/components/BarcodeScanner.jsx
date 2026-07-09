import React from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button, Dialog, Input } from "./primitives.jsx";

export default function BarcodeScanner({ open, title = "Scan barcode", onDetected, onClose }) {
  const videoRef = React.useRef(null);
  const controlsRef = React.useRef(null);
  const [manualCode, setManualCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [scanning, setScanning] = React.useState(false);

  React.useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 250 });

    async function start() {
      setError("");
      setScanning(true);

      try {
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err, ctrl) => {
          if (result) {
            const text = result.getText();
            ctrl.stop();
            controlsRef.current = null;
            setScanning(false);
            onDetected(text);
          }
        });

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
      } catch {
        if (!cancelled) {
          setError("Camera unavailable. Enter barcode manually.");
          setScanning(false);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setScanning(false);
    };
  }, [open, onDetected]);

  if (!open) return null;

  const submitManual = (event) => {
    event.preventDefault();
    const code = manualCode.trim();
    if (code) onDetected(code);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      icon="barcode"
      size="lg"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="mt-4 grid gap-4 text-text">
        <p className="text-sm text-text-muted">
          {scanning ? "Point camera at a barcode." : "Camera fallback is ready."}
        </p>
        <div className="grid gap-4">
          <div className="aspect-video overflow-hidden rounded-card border border-border bg-surface-muted">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          </div>

          {error && (
            <p className="rounded-control border border-warning/20 bg-warning-soft px-3 py-2 text-sm font-medium text-warning">
              {error}
            </p>
          )}

          <form onSubmit={submitManual} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label="Manual barcode"
              placeholder="8991001000011"
              inputProps={{
                value: manualCode,
                onChange: (event) => setManualCode(event.target.value),
                inputMode: "numeric",
              }}
            />
            <Button type="submit" variant="primary" className="h-[42px]">
              Use code
            </Button>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
