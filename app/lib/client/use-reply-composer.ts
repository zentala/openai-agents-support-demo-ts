"use client";

/** Thread/consultant-keyed reply draft. A refused draft stays in the composer for editing. */
import { useRef, useState } from "react";
import type { ActionResponse } from "@/lib/admin/types";

export function useReplyComposer(blocked: boolean, onReply: (text: string) => Promise<ActionResponse>) {
  const [text, setText] = useState("");
  const [warning, setWarning] = useState<string>();
  const sending = useRef(false);
  const edit = (value: string) => { setText(value); setWarning(undefined); };
  const exclusive = async (work: () => Promise<void>) => {
    if (sending.current) return;
    sending.current = true;
    try { await work(); } finally { sending.current = false; }
  };
  const send = async () => {
    if (blocked || sending.current || !text.trim()) return;
    await exclusive(async () => {
      const result = await onReply(text);
      if (result.ok) { setText(""); setWarning(undefined); }
      else setWarning(`${result.errorType}: ${result.message}`);
    });
  };
  return { text, warning, exclusive, edit, send };
}
