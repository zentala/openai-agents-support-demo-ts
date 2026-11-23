/** Customer reports and answer questions tied to a server-owned transcript entry. */
import { addMessageReport, findOpenTicketForThread, listMessageReports } from "@/lib/data/store";
import { getThread } from "./threads";
import { openTicket } from "./tickets";

export function createMessageConcern(threadId: string, entryId: string, reason: string, kind: "report" | "question") {
  const thread = getThread(threadId);
  const entry = thread?.transcript.find((item) => item.id === entryId && (item.role === "agent" || item.role === "consultant"));
  if (!thread || !entry) return { ok: false as const, errorType: "MessageNotFound", message: "That answer is no longer available." };
  const author = entry.role === "agent" ? "AI assistant" : entry.author ?? "Consultant";
  const concern = addMessageReport({ threadId, entryId, quote: entry.text.slice(0, 500), author, reason: reason.trim().slice(0, 300), kind });
  const category = kind === "question" ? "answer_question" as const : "message_report" as const;
  const prefix = kind === "question" ? "Customer asks a person about an answer" : `Customer reports a message by ${author}`;
  const existing = findOpenTicketForThread(threadId);
  if (existing) {
    existing.summary += `\n${prefix}: “${concern.quote}” Reason: ${concern.reason}`;
    if (entry.role === "consultant") { existing.category = "manager_review"; existing.reason = "manager_review"; }
    else if (!["manager_review", "manager_requested"].includes(existing.category ?? "")) { existing.category = category; existing.reason = category; }
  } else {
    openTicket({ customerId: thread.customerId, threadId, traceId: thread.traceId,
      summary: `${prefix}: “${concern.quote}” Reason: ${concern.reason}`, source: "rule",
      reason: entry.role === "consultant" ? "consultant_message_report" : category,
      category: entry.role === "consultant" ? "manager_review" : category });
  }
  return { ok: true as const, id: concern.id, status: kind === "report" ? "REPORT_CREATED" as const : "QUESTION_CREATED" as const };
}

export function createLatestMessageConcern(threadId: string, reason: string, kind: "report" | "question") {
  const entry = getThread(threadId)?.transcript.slice().reverse().find((item) => item.role === "agent");
  return entry ? createMessageConcern(threadId, entry.id, reason, kind) : { ok: false as const, errorType: "MessageNotFound", message: "There is no answer to attach this request to." };
}

export const unansweredQuestionForThread = (threadId: string) => listMessageReports().find((item) => item.threadId === threadId && item.kind === "question" && !item.answeredAt);

export const hasMessageConcernForThread = (threadId: string, kind: "report" | "question"): boolean =>
  listMessageReports().some((item) => item.threadId === threadId && item.kind === kind);

export function markQuestionAnswered(id: string): void {
  const question = listMessageReports().find((item) => item.id === id);
  if (question) question.answeredAt = new Date().toISOString();
}
