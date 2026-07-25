import React from "react";
import {
  readScanSoundEnabled,
  SCAN_SOUND_PREFERENCE_EVENT,
  SCAN_SOUND_STORAGE_KEY,
  writeScanSoundEnabled,
} from "../preferences/scan-feedback.js";

export function useScanSoundPreference() {
  const [enabled, setEnabled] = React.useState(readScanSoundEnabled);

  React.useEffect(() => {
    const syncPreference = (event) => {
      if (event.type === "storage" && event.key !== SCAN_SOUND_STORAGE_KEY) return;
      setEnabled(event.detail?.enabled ?? readScanSoundEnabled());
    };
    window.addEventListener("storage", syncPreference);
    window.addEventListener(SCAN_SOUND_PREFERENCE_EVENT, syncPreference);
    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(SCAN_SOUND_PREFERENCE_EVENT, syncPreference);
    };
  }, []);

  const updateEnabled = React.useCallback((next) => {
    setEnabled(writeScanSoundEnabled(next));
  }, []);

  return [enabled, updateEnabled];
}
