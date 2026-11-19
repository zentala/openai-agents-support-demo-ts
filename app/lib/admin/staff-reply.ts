/**
 * Server-only tone warning before either reply route can take over or send.
 * A one-shot acknowledgement binds the exact validated text, consultant, action and owning thread.
 */
import { getThread, type Thread } from "@/lib/runtime/threads";
import { reduceTakeover } from "@/lib/runtime/takeover-state";
import { consultantReply, takeOverAndReply } from "@/lib/runtime/takeover";
import { recordToneAudit } from "./audit";
import type { AdminAction, ActionResponse } from "./types";

type ReplyAttempt = Extract<AdminAction, { type: "reply" | "take_over_and_reply" }>;
const RUDE_WORDS = new Set([
  "fuck", "fucking", "shit", "bullshit", "asshole", "bitch", "idiot", "idiots", "stupid", "moron",
  "jebac", "jebany", "jebana", "pierdol", "spierdalaj", "wypierdalaj", "kurwa", "chuj", "debil", "idiota", "idiotka", "glupi", "glupia",
]);

/** A simple warning list, not a claim that every rude message is detected. Whole words avoid substring hits. */
export const hasRudeTone = (text: string): boolean => text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ł", "l")
  .split(/[^\p{L}]+/u).some((word) => RUDE_WORDS.has(word));

function matches(thread: Thread, action: ReplyAttempt): boolean {
  const pending = thread.pendingReplyWarning;
  return !!pending && pending.consultant === action.consultant && pending.text === action.text && pending.action === action.type;
}

function warn(thread: Thread, action: ReplyAttempt): ActionResponse {
  if (!matches(thread, action)) {
    const id = crypto.randomUUID();
    thread.pendingReplyWarning = { id, consultant: action.consultant, text: action.text, action: action.type };
    recordToneAudit(thread, action.consultant, id, "tone_warning");
  }
  return { ok: false, errorType: "StaffToneWarning", warningId: thread.pendingReplyWarning!.id,
    message: "This may sound rude to the customer. Send anyway?" };
}

export function sendStaffReply(action: ReplyAttempt): ActionResponse {
  const thread = getThread(action.threadId);
  if (!thread) return { ok: false, errorType: "UnknownThread", message: `No conversation ${action.threadId}` };
  const ownership = reduceTakeover(thread.takeover, action.type === "take_over_and_reply" && thread.takeover.status === "agent"
    ? { type: "take", consultant: action.consultant, at: Date.now() } : { type: "reply", consultant: action.consultant });
  if (!ownership.ok) return ownership;
  const acknowledged = !!action.toneAcknowledgement && matches(thread, action) && thread.pendingReplyWarning?.id === action.toneAcknowledgement;
  if (action.toneAcknowledgement && !acknowledged) {
    delete thread.pendingReplyWarning;
    return hasRudeTone(action.text) ? warn(thread, action) : { ok: false, errorType: "ToneAcknowledgementMismatch", message: "The reply changed. Review and send the current text again." };
  }
  if (!acknowledged && hasRudeTone(action.text)) return warn(thread, action);
  const warningId = acknowledged ? thread.pendingReplyWarning!.id : undefined;
  const result = action.type === "take_over_and_reply"
    ? takeOverAndReply(action.threadId, action.consultant, action.text) : consultantReply(action.threadId, action.consultant, action.text);
  if (result.ok) {
    delete thread.pendingReplyWarning;
    if (warningId) recordToneAudit(thread, action.consultant, warningId, "sent_after_warning");
  }
  return result;
}
