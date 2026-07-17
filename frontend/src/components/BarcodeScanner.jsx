import React from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Icon, useDialogPresence } from "./primitives.jsx";

export default function BarcodeScanner({ open, title = "Pindai barcode", onDetected, onClose }) {
  const { isPresent, isVisible } = useDialogPresence(open);
  const videoRef = React.useRef(null);
  const controlsRef = React.useRef(null);
  const onDetectedRef = React.useRef(onDetected);
  const lastDetectionRef = React.useRef({ code: "", at: 0 });
  const [manualCode, setManualCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [scanning, setScanning] = React.useState(false);

  React.useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  React.useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 250 });

    async function start() {
      if (!videoRef.current) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (cancelled || !videoRef.current) return;
      }

      setError("");
      setScanning(true);

      try {
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (result) {
            const text = result.getText();
            const now = Date.now();
            const duplicate = lastDetectionRef.current.code === text;
            lastDetectionRef.current = { code: text, at: now };
            if (duplicate) return;
            onDetectedRef.current(text);
          } else if (err && Date.now() - lastDetectionRef.current.at >= 750) {
            lastDetectionRef.current = { code: "", at: 0 };
          }
        });

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
      } catch {
        if (!cancelled) {
          setError("Kamera tidak tersedia. Masukkan barcode secara manual.");
          setScanning(false);
        }
      }
    }

    const raf = requestAnimationFrame(() => {
      if (!cancelled) start();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      controlsRef.current?.stop();
      controlsRef.current = null;
      setScanning(false);
    };
  }, [open]);

  if (!isPresent) return null;

  const submitManual = (event) => {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setManualCode("");
    onDetectedRef.current(code);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black transition-opacity duration-200 ease-standard motion-reduce:transition-opacity ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isVisible}
    >
      <section
        className="relative h-full w-full overflow-hidden bg-black"
      >
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline autoPlay />

        <div className="absolute inset-0 z-[1] grid place-items-center pointer-events-none">
          <div className="h-[min(48vw,21rem)] w-[min(74vw,28rem)] rounded-[28px] border border-white/20 sm:h-[min(42vw,24rem)] sm:w-[min(62vw,32rem)]" />
        </div>

        <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-black/60 via-black/25 to-transparent px-5 pb-6 pt-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
            <p className="text-sm text-white/70">
              {scanning ? "Arahkan kamera ke barcode." : "Mode input manual siap digunakan."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 text-white backdrop-blur-xl transition hover:bg-white/35 active:bg-white/45"
          >
            <Icon name="x" className="size-[15px]" />
          </button>
        </header>

        <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-5 pt-10">
          {error && (
            <p className="rounded-xl bg-warning-soft/95 px-3.5 py-2.5 text-sm font-medium text-warning text-center">
              {error}
            </p>
          )}
          <form onSubmit={submitManual} className="flex gap-2.5">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              inputMode="numeric"
              placeholder="Masukkan barcode manual"
              className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/12 px-4 py-2.5 text-sm font-medium text-white placeholder:text-white/35 backdrop-blur-xl outline-none transition focus:border-white/30 focus:bg-white/20"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1d1d1f] shadow-sm transition active:bg-white/80"
            >
              Gunakan kode
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
