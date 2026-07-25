export const SCAN_SOUND_STORAGE_KEY = "balanja.scan-sound-enabled";
export const SCAN_SOUND_PREFERENCE_EVENT = "balanja:scan-sound-preference";

let audioContext = null;

function preferenceStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readScanSoundEnabled(storage = preferenceStorage()) {
  try {
    const value = storage?.getItem(SCAN_SOUND_STORAGE_KEY);
    return value === null || value === undefined ? true : value !== "false";
  } catch {
    return true;
  }
}

export function writeScanSoundEnabled(enabled, storage = preferenceStorage()) {
  const next = Boolean(enabled);
  try {
    storage?.setItem(SCAN_SOUND_STORAGE_KEY, String(next));
  } catch {
    // The in-memory UI state still changes when browser storage is unavailable.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SCAN_SOUND_PREFERENCE_EVENT, { detail: { enabled: next } }));
  }
  return next;
}

function prefersQuietFeedback() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function getAudioContext() {
  if (audioContext || typeof window === "undefined") return audioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

export async function primeScanSuccessSound() {
  if (!readScanSoundEnabled() || prefersQuietFeedback()) return false;
  const context = getAudioContext();
  if (!context) return false;
  try {
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}

export async function playScanSuccessSound() {
  if (!(await primeScanSuccessSound())) return false;
  const context = getAudioContext();
  if (!context) return false;

  const startedAt = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(740, startedAt);
  oscillator.frequency.exponentialRampToValueAtTime(980, startedAt + 0.08);
  gain.gain.setValueAtTime(0.12, startedAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startedAt + 0.09);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startedAt);
  oscillator.stop(startedAt + 0.09);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  return true;
}
