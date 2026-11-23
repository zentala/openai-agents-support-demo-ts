/**
 * Server-only moderation before either reply route can take over or send.
 * Ownership, local insult checks and model tone checks all precede customer-visible effects.
 */
import { getThread, type Thread } from "@/lib/runtime/threads";
import { reduceTakeover } from "@/lib/runtime/takeover-state";
import { consultantReply, managerTakeOver, releaseTakeoverPreservingTickets, takeOverAndReply } from "@/lib/runtime/takeover";
import { recordToneAudit } from "./audit";
import type { AdminAction, ActionResponse } from "./types";
import OpenAI from "openai";
import { GUARDRAIL_MODEL } from "@/lib/config";
import { requestApiKey, redactSecrets } from "@/lib/security/request-key";
import { findOpenTicketForThread } from "@/lib/data/store";
import { openTicket } from "@/lib/runtime/tickets";
import { isManager } from "./consultants";
import { markQuestionAnswered, unansweredQuestionForThread } from "@/lib/runtime/message-concerns";

type ReplyAttempt = Extract<AdminAction, { type: "reply" | "take_over_and_reply" }>;
const RUDE_STEMS = ["fuck", "shit", "bullshit", "asshole", "bitch", "idiot", "stupid", "moron", "lamus", "debil", "kurw", "jeb", "pierdol", "spierdal", "chuj", "glup", "arschloch", "dumm", "scheiss"];

/** A simple warning list, not a claim that every rude message is detected. Whole words avoid substring hits. */
export const rudeWord = (text: string): string | undefined => {
  const normalized = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ł", "l");
  const word = normalized.split(/[^\p{L}]+/u).find((part) => !part.startsWith("dummy") && RUDE_STEMS.some((stem) => part.startsWith(stem)));
  return word ? text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").split(/[^\p{L}]+/u).find((part) => part.toLowerCase().startsWith(word)) ?? word : undefined;
};

export const hasRudeTone = (text: string): boolean => Boolean(rudeWord(text));

async function classifyTone(text: string): Promise<{ rude: boolean; reason?: string }> {
  const apiKey = requestApiKey();
  const client = apiKey ? new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1", organization: null, project: null }) : new OpenAI();
  const result = await client.responses.create({ model: GUARDRAIL_MODEL, input: [
    { role: "system", content: "Would a customer read this support reply as rude, insulting or unprofessional? Return only JSON: {\"rude\": boolean, \"reason\": short string}." },
    { role: "user", content: text },
  ] });
  const parsed = JSON.parse(result.output_text) as { rude?: unknown; reason?: unknown };
  if (typeof parsed.rude !== "boolean") throw new Error("Tone classifier returned an invalid verdict.");
  return { rude: parsed.rude, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 160) : undefined };
}

function blocked(thread: Thread, consultant: string, reason: string, draft: string): ActionResponse {
  recordToneAudit(thread, consultant, crypto.randomUUID(), "reply_blocked", reason);
  thread.blockedReplies ??= {};
  const attempts = thread.blockedReplies[consultant] ?? (thread.blockedReplies[consultant] = []);
  attempts.push(`${draft} · ${reason}`);
  if (attempts.length >= 3) {
    thread.staffLockouts ??= [];
    if (!thread.staffLockouts.includes(consultant)) thread.staffLockouts.push(consultant);
    if (attempts.length === 3) {
      const existing = findOpenTicketForThread(thread.threadId);
      if (existing) {
        existing.category = "manager_review";
        existing.reason = "manager_review";
        existing.summary += ` Manager review: ${consultant} locked after three blocked replies. Drafts: ${attempts.join(" | ")}`;
      } else openTicket({ customerId: thread.customerId, threadId: thread.threadId, traceId: thread.traceId,
        summary: `Manager review: ${consultant} was locked after three blocked reply attempts. Drafts: ${attempts.join(" | ")}`,
        source: "rule", reason: "manager_review", category: "manager_review" });
      releaseTakeoverPreservingTickets(thread, consultant);
    }
  }
  return { ok: false, errorType: "StaffReplyBlocked", message: `This reply sounds insulting: '${reason}'. Rephrase it.` };
}

export async function sendStaffReply(action: ReplyAttempt): Promise<ActionResponse> {
  const thread = getThread(action.threadId);
  if (!thread) return { ok: false, errorType: "UnknownThread", message: `No conversation ${action.threadId}` };
  if (thread.staffLockouts?.includes(action.consultant) && !isManager(action.consultant)) return { ok: false, errorType: "StaffLockedOut", message: "This consultant is locked out of this conversation. A manager must unlock access." };
  if (!isManager(action.consultant)) {
    const ownership = reduceTakeover(thread.takeover, action.type === "take_over_and_reply" && thread.takeover.status === "agent"
      ? { type: "take", consultant: action.consultant, at: Date.now() } : { type: "reply", consultant: action.consultant });
    if (!ownership.ok) return ownership;
  }
  const word = rudeWord(action.text);
  if (word) return blocked(thread, action.consultant, word, action.text);
  let tone: { rude: boolean; reason?: string };
  try { tone = await classifyTone(action.text); }
  catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    return { ok: false, errorType: cause.name || "ToneClassifierError", message: redactSecrets(cause.message) };
  }
  if (tone.rude) return blocked(thread, action.consultant, tone.reason || "unprofessional wording", action.text);
  if (isManager(action.consultant) && thread.takeover.status === "human" && thread.takeover.consultant !== action.consultant) managerTakeOver(action.threadId, action.consultant);
  const ownership = reduceTakeover(thread.takeover, action.type === "take_over_and_reply" && thread.takeover.status === "agent"
    ? { type: "take", consultant: action.consultant, at: Date.now() } : { type: "reply", consultant: action.consultant });
  if (!ownership.ok) return ownership;
  if (isManager(action.consultant) && thread.takeover.status === "human" && thread.takeover.consultant !== action.consultant) {
    return { ok: false, errorType: "TakeoverOwned", message: `Conversation is handled by ${thread.takeover.consultant}.` };
  }
  const question = unansweredQuestionForThread(action.threadId);
  const replyText = question ? `About: “${question.quote.slice(0, 160)}”\n\n${action.text}` : action.text;
  const result = action.type === "take_over_and_reply"
    ? takeOverAndReply(action.threadId, action.consultant, replyText) : consultantReply(action.threadId, action.consultant, replyText);
  if (result.ok) {
    if (thread.blockedReplies?.[action.consultant]) delete thread.blockedReplies[action.consultant];
    if (question) markQuestionAnswered(question.id);
  }
  return result;
}
