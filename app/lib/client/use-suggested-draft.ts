"use client";

/** A cancellable suggestion only writes local draft text; user edits and submits always stop it. */
import { useEffect, useRef, useState } from "react";
import type { DraftSuggestion } from "./scenario-progress";

export function typeSuggestedDraft(text: string, update: (text: string) => void, reducedMotion: boolean) {
  let cancelled = false;
  let offset = 0;
  const batch = reducedMotion ? Math.max(1, text.length) : Math.max(1, Math.ceil(text.length / 30));
  let timer: ReturnType<typeof setTimeout>;
  const tick = () => {
    if (cancelled) return;
    offset = Math.min(text.length, offset + batch);
    update(text.slice(0, offset));
    if (offset < text.length) timer = setTimeout(tick, 20);
  };
  timer = setTimeout(tick, 0);
  return () => { cancelled = true; clearTimeout(timer); };
}

export function useSuggestedDraft(suggestion?: DraftSuggestion) {
  const [draft, setDraft] = useState("");
  const manual = useRef(false);
  const stop = useRef<() => void>(() => {});
  const key = suggestion?.key;
  const text = suggestion?.text ?? "";
  useEffect(() => {
    if (manual.current) return;
    const cancel = typeSuggestedDraft(text, setDraft, matchMedia("(prefers-reduced-motion: reduce)").matches);
    stop.current = cancel;
    return cancel;
  }, [key, text]);
  const edit = (text: string) => { stop.current(); manual.current = true; setDraft(text); };
  const sent = () => { stop.current(); manual.current = false; setDraft(""); };
  return { draft, edit, sent };
}
