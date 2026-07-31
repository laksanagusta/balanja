import React from "react";
import { createPortal } from "react-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Icon, useDialogPresence } from "./primitives.jsx";
import { playScanSuccessSound, primeScanSuccessSound } from "../preferences/scan-feedback.js";
import { ScanResultConfirmation } from "./scan/ScanResultConfirmation.jsx";

const MIN_PROCESSING_MS = 180;
const SAME_CODE_COOLDOWN_MS = 1000;
const RESULT_HOLD_MS = 900;
const RESULT_EXIT_MS = 140;
const CLOSE_AFTER_SUCCESS_MS = 650;
const SCANNER_CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    advanced: [{ focusMode: "continuous" }],
  },
};

function cameraErrorMessage(error) {
  if (!window.isSecureContext) {
    return "Kamera hanya dapat digunakan melalui koneksi HTTPS. Masukkan barcode secara manual.";
  }

  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Izin kamera ditolak. Izinkan akses kamera di pengaturan browser, lalu buka scanner kembali.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "Kamera tidak ditemukan di perangkat ini. Masukkan barcode secara manual.";
    case "NotReadableError":
    case "TrackStartError":
      return "Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut, lalu buka scanner kembali.";
    default:
      return "Kamera tidak dapat dimulai. Masukkan barcode secara manual.";
  }
}

export default function BarcodeScanner({ open, title = "Pindai barcode", onDetected, onClose }) {
  const { isPresent, isVisible } = useDialogPresence(open);
  const videoRef = React.useRef(null);
  const controlsRef = React.useRef(null);
  const onDetectedRef = React.useRef(onDetected);
  const onCloseRef = React.useRef(onClose);
  const lastDetectionRef = React.useRef({ code: "", acceptedAt: 0 });
  const processingRef = React.useRef(false);
  const processingRunRef = React.useRef(0);
  const processingTimerRef = React.useRef(null);
  const feedbackHideTimerRef = React.useRef(null);
  const feedbackRemoveTimerRef = React.useRef(null);
  const closeTimerRef = React.useRef(null);
  const [manualCode, setManualCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [scanning, setScanning] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null);
  const [feedbackVisible, setFeedbackVisible] = React.useState(false);
  const [hasDetected, setHasDetected] = React.useState(false);

  React.useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const processDetection = React.useCallback(async (code) => {
    if (processingRef.current) return;

    const runId = processingRunRef.current + 1;
    processingRunRef.current = runId;
    processingRef.current = true;
    setProcessing(true);
    setFeedbackVisible(false);
    window.clearTimeout(feedbackHideTimerRef.current);
    window.clearTimeout(feedbackRemoveTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
    setError("");
    setHasDetected(true);
    const startedAt = Date.now();
    let outcome = {
      ok: true,
      message: "Barcode berhasil dipindai",
      description: code,
      close: false,
    };

    try {
      const result = await onDetectedRef.current?.(code);
      if (result?.ok === false) {
        outcome = {
          ok: false,
          message: result.error || result.message || "Barcode gagal diproses",
          description: result.description || code,
          close: false,
        };
      } else if (result) {
        outcome = {
          ...outcome,
          ...result,
          ok: true,
          description: result.description || code,
        };
      }
    } catch {
      outcome = {
        ok: false,
        message: "Barcode gagal diproses. Coba pindai kembali.",
        description: code,
        close: false,
      };
    } finally {
      if (processingRunRef.current !== runId) return;

      const finish = () => {
        if (processingRunRef.current !== runId) return;
        processingRef.current = false;
        processingTimerRef.current = null;
        setProcessing(false);
        setFeedback({ ...outcome, tone: outcome.ok ? "success" : "error" });
        setFeedbackVisible(true);
        feedbackHideTimerRef.current = window.setTimeout(() => {
          setFeedbackVisible(false);
          feedbackRemoveTimerRef.current = window.setTimeout(() => setFeedback(null), RESULT_EXIT_MS);
        }, RESULT_HOLD_MS);

        if (outcome.ok) {
          void playScanSuccessSound();
          if (outcome.close) {
            closeTimerRef.current = window.setTimeout(() => onCloseRef.current?.(), CLOSE_AFTER_SUCCESS_MS);
          }
        }
      };
      const remaining = Math.max(0, MIN_PROCESSING_MS - (Date.now() - startedAt));
      processingTimerRef.current = window.setTimeout(finish, remaining);
    }
  }, []);

  React.useEffect(() => {
    if (open) return;
    processingRunRef.current += 1;
    processingRef.current = false;
    window.clearTimeout(processingTimerRef.current);
    processingTimerRef.current = null;
    window.clearTimeout(feedbackHideTimerRef.current);
    window.clearTimeout(feedbackRemoveTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
    feedbackHideTimerRef.current = null;
    feedbackRemoveTimerRef.current = null;
    closeTimerRef.current = null;
    lastDetectionRef.current = { code: "", acceptedAt: 0 };
    setProcessing(false);
    setFeedbackVisible(false);
    setFeedback(null);
    setHasDetected(false);
  }, [open]);

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

      try {
        const controls = await reader.decodeFromConstraints(SCANNER_CAMERA_CONSTRAINTS, videoRef.current, (result, err) => {
          if (result) {
            if (processingRef.current) return;
            const text = result.getText();
            const now = Date.now();
            const repeatedTooSoon = lastDetectionRef.current.code === text
              && now - lastDetectionRef.current.acceptedAt < SAME_CODE_COOLDOWN_MS;
            if (repeatedTooSoon) return;
            lastDetectionRef.current = { code: text, acceptedAt: now };
            void processDetection(text);
          }
        });

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setScanning(true);
      } catch (cameraError) {
        if (!cancelled) {
          setError(cameraErrorMessage(cameraError));
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
  }, [open, processDetection]);

  if (!isPresent) return null;

  const showScanHint = scanning && !processing && !hasDetected;

  const submitManual = (event) => {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code || processingRef.current) return;
    void primeScanSuccessSound();
    setManualCode("");
    void processDetection(code);
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] bg-black transition-opacity duration-200 ease-standard motion-reduce:transition-opacity ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isVisible}
    >
      <section
        className="relative h-full w-full overflow-hidden bg-black"
        aria-busy={processing}
      >
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline autoPlay />

        <div
          className="pointer-events-none absolute inset-0 z-[2] grid place-items-center px-6"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-hidden={!processing && !showScanHint}
        >
          <div className="relative">
            <p
              className={`absolute top-0 left-1/2 -translate-x-1/2 text-center text-sm font-semibold whitespace-nowrap text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-[opacity,transform] duration-fast ease-standard motion-reduce:transform-none ${
                showScanHint
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              }`}
            >
              Arahkan kamera ke barcode.
            </p>
            <p
              className={`absolute top-0 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-[opacity,transform] duration-fast ease-standard motion-reduce:transform-none ${
                processing
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              }`}
            >
              {processing ? <Icon name="loader" className="size-4 [animation-duration:700ms]" /> : null}
              <span>{processing ? "Memproses barcode…" : ""}</span>
            </p>
          </div>
        </div>

        <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-black/60 via-black/25 to-transparent px-5 pb-6 pt-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
            <p className="mt-0.5 min-h-5 text-sm text-white/70">
              {processing ? "Barcode terdeteksi." : "Mode input manual siap digunakan."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Selesai memindai"
            onClick={onClose}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-white/20 px-4 text-sm font-semibold text-white backdrop-blur-xl transition-[transform,background-color] duration-fast ease-standard active:scale-[0.97] active:bg-white/45 motion-reduce:active:scale-100"
          >
            Selesai
          </button>
        </header>

        <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-5 pt-10">
          <div className="flex min-h-[52px] justify-center">
            <ScanResultConfirmation feedback={feedback} visible={feedbackVisible} />
          </div>
          {error && (
            <p className="rounded-xl bg-warning-soft/95 px-3.5 py-2.5 text-sm font-medium text-warning text-center">
              {error}
            </p>
          )}
          <form onSubmit={submitManual} className="flex gap-2.5">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              disabled={processing}
              inputMode="numeric"
              placeholder="Masukkan barcode manual"
              className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/12 px-4 py-2.5 text-sm font-medium text-white placeholder:text-white/35 backdrop-blur-xl outline-none transition-[opacity,background-color,border-color] duration-fast ease-standard focus:border-white/30 focus:bg-white/20 disabled:cursor-wait disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={processing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1d1d1f] shadow-sm transition-[transform,opacity,background-color] duration-fast ease-standard active:scale-[0.97] active:bg-white/80 disabled:cursor-wait disabled:opacity-65 motion-reduce:active:scale-100"
            >
              {processing ? "Memproses" : "Gunakan kode"}
            </button>
          </form>
        </div>
      </section>
    </div>,
    document.body,
  );
}
