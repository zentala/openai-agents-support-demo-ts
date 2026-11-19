/**
 * Vercel AI SDK: the chat endpoint.
 *
 * Concepts shown here:
 * - `createUIMessageStream` + `createUIMessageStreamResponse`: the response is a
 *   stream of "UI message chunks" that `useChat` in the browser understands.
 * - ONE stream carries two things: text parts (the chat bubble) and typed
 *   *data parts* (`data-agent-event`). `transient: true` means "deliver to onData, but do not
 *   store in chat history". Only CUSTOMER-VISIBLE events are written here (see
 *   lib/runtime/event-visibility.ts); the Agent View gets the internal ones from the inspector channel.
 * - Approvals are NOT decided here: they belong to the consultant console (/api/admin/actions).
 *
 * SECURITY: the thread must exist and the request must carry its credential cookie. The customer is
 * read from the stored thread, not from this request.
 */
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { describeError } from "@/lib/runtime/errors";
import { subscribeToThread } from "@/lib/runtime/event-bus";
import { toCustomerEvent } from "@/lib/runtime/event-visibility";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { handleUserMessage } from "@/lib/runtime/turn";
import { authorizeThread } from "@/lib/security/thread-access";
import { THREAD_ID_PATTERN } from "@/lib/security/thread-credential";
import { withRequestKey } from "@/lib/security/request-key";
import { publicRateLimit } from "@/lib/security/public-rate-limit";
import type { ChatWidget, SupportUIMessage } from "@/lib/types";
import { customerMessages } from "@/lib/runtime/customer-messages";
import { addTranscript } from "@/lib/runtime/threads";
import { automaticStep } from "@/lib/message-kinds";

export const maxDuration = 120;

const bodySchema = z.object({
  threadId: z.string().regex(THREAD_ID_PATTERN),
  messages: z.array(z.object({ role: z.string(), parts: z.array(z.any()) })).default([]),
  // A click on a chat widget. Validated again on the server (ownership) in applySelection.
  selection: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("order"), orderId: z.string().max(40) }),
      z.object({ type: z.literal("address"), orderId: z.string().max(40), proposalId: z.string().uuid(), decision: z.enum(["confirm", "cancel"]) }),
      z.object({ type: z.literal("quick-reply"), offerId: z.string().uuid(), decision: z.enum(["yes", "no"]) }),
    ])
    .optional(),
});

const errorJson = (status: number, errorType: string, message: string) =>
  Response.json({ errorType, message }, { status });

/** The last user message of the AI SDK `messages` array, as plain text. */
function lastUserText(messages: { role: string; parts: { type: string; text?: string }[] }[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  return (last?.parts ?? []).filter((p) => p.type === "text").map((p) => p.text ?? "").join("\n");
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return errorJson(400, "InvalidRequest", `Bad chat request: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const { threadId, messages, selection } = parsed.data;

  const access = authorizeThread(req, threadId);
  if (!access.ok) return access.response;
  const limited = publicRateLimit(req, "chat", threadId);
  if (limited) return limited;
  const ctx = sessionContextOf(access.thread);

  // INTERVIEW: one stream, two payloads - chat text for the user, typed data parts for the widgets and banners.
  const stream = createUIMessageStream<SupportUIMessage>({
    execute: async ({ writer }) => {
      // Widgets are kept back and written AFTER the text, so the card appears under the sentence that introduces it.
      const widgets: ChatWidget[] = [];
      const unsubscribe = subscribeToThread(threadId, (event) => {
        const visible = toCustomerEvent(event);
        if (!visible) return;
        if (visible.kind === "widget") widgets.push(visible.widget);
        writer.write({ type: "data-agent-event", data: visible, transient: true });
      });
      try {
        const outcome = await withRequestKey(req, () => handleUserMessage(ctx, lastUserText(messages), selection));
        // While a consultant is in charge the agent stays silent: there is no text to stream.
        // The customer sees the consultant's reply through the thread channel instead.
        if (!outcome.handledByHuman) {
          writer.write({ type: "data-messages", data: customerMessages(outcome) });
          // A text part is start -> delta(s) -> end, all with the same id.
          const id = crypto.randomUUID();
          writer.write({ type: "text-start", id });
          writer.write({ type: "text-delta", id, delta: outcome.reply });
          writer.write({ type: "text-end", id });
        }
        // Not transient: a widget is part of the conversation, so it is stored in the message and rendered by the browser.
        widgets.forEach((widget) => writer.write({ type: "data-widget", data: widget }));
      } catch (error) {
        const described = describeError(error);
        const sender = automaticStep("Request failed");
        addTranscript(access.thread, { role: "system", text: described.chatSentence, sender });
        writer.write({ type: "data-messages", data: [{ text: described.chatSentence, sender }] });
        const id = crypto.randomUUID();
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: described.chatSentence });
        writer.write({ type: "text-end", id });
      } finally {
        unsubscribe();
      }
    },
    // Last resort: anything that escapes becomes a specific message, never a generic one.
    onError: (error) => describeError(error).chatSentence,
  });
  return createUIMessageStreamResponse({ stream });
}
