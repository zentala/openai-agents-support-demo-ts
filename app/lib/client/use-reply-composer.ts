"use client";

/** Thread/consultant-keyed draft and explicit tone acknowledgement. Editing always clears consent. */
import { useRef, useState } from "react";
import type { ActionResponse } from "@/lib/admin/types";

export function useReplyComposer(blocked: boolean, onReply: (text: string, acknowledgement?: string) => Promise<ActionResponse>) {
  const [text, setText] = useState("");
  const [warning, setWarning] = useState<{ id: string; text: string; message: string }>();
  const sending = useRef(false);
  const edit = (value: string) => { setText(value); setWarning(undefined); };
  const exclusive = async (work: () => Promise<void>) => {
    if (sending.current) return;
    sending.current = true;
    try { await work(); } finally { sending.current = false; }
  };
  const send = async (anyway = false) => {
    if (blocked || sending.current || !text.trim() || (warning && !anyway)) return;
    if (anyway && (!warning || warning.text !== text)) return;
    await exclusive(async () => {
      const result = await onReply(text, anyway ? warning?.id : undefined);
      if (result.ok) { setText(""); setWarning(undefined); }
      else if (result.errorType === "StaffToneWarning" && result.warningId) setWarning({ id: result.warningId, text, message: result.message });
    });
  };
  return { text, warning, exclusive, edit, send };
}
