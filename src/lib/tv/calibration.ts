import type { Anchor, Calibration } from "./schedule";

// Anchors set on /tv/calibrate are kept in this browser until they are copied
// into the schedule.
const STORAGE_KEY = "tv-calibration";

export function loadCalibration(): Calibration {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveCalibration(calibration: Calibration) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration));
  } catch {}
}

export function setAnchor(calibration: Calibration, key: string, anchor: Anchor | null): Calibration {
  const next = { ...calibration };
  if (anchor) next[key] = anchor;
  else delete next[key];
  saveCalibration(next);
  return next;
}
