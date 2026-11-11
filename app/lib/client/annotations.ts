/** Browser opt-in store: React's external-store hook keeps the toolbar and Settings in sync. */
import { useSyncExternalStore } from "react";

const ACCESS = "nordic-dev-annotations-allowed";
const ENABLED = "nordic-dev-annotations-enabled";
const CHANGE = "nordic-annotations-change";
let storageError = "";

/** The public default grants no annotation access. This is a developer convenience, not auth. */
export function annotationAccess(env: boolean, query: boolean, remembered: boolean): boolean {
  return env || query || remembered;
}

function snapshot(): string {
  if (storageError) return `error:${storageError}`;
  try {
    const query = new URLSearchParams(window.location.search).get("annotate") === "1";
    const allowed = annotationAccess(process.env.NEXT_PUBLIC_DEV_ANNOTATIONS === "true", query, localStorage.getItem(ACCESS) === "1");
    return allowed ? localStorage.getItem(ENABLED) === "false" ? "off" : "on" : "unavailable";
  } catch (error) {
    return `error:${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`;
  }
}

function subscribe(notify: () => void) {
  window.addEventListener(CHANGE, notify);
  window.addEventListener("storage", notify);
  return () => { window.removeEventListener(CHANGE, notify); window.removeEventListener("storage", notify); };
}

/** Persist the explicit URL grant so subsequent navigation does not require the query parameter. */
export function rememberAnnotationAccess() {
  write(() => {
    if (new URLSearchParams(window.location.search).get("annotate") === "1") localStorage.setItem(ACCESS, "1");
  });
}

export function setAnnotationsEnabled(enabled: boolean) {
  write(() => localStorage.setItem(ENABLED, String(enabled)));
}

function write(action: () => void) {
  try { action(); storageError = ""; }
  catch (error) { storageError = error instanceof Error ? `${error.name}: ${error.message}` : String(error); }
  window.dispatchEvent(new Event(CHANGE));
}

export function useAnnotations() {
  // A stable server snapshot avoids accessing browser storage during SSR or hydration.
  return useSyncExternalStore(subscribe, snapshot, () => "unavailable");
}
