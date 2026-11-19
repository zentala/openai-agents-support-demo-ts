/** Prompt ticket state is read from code-owned thread and ticket records. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildInstructions, ORDERS_ROLE } from "@/lib/agents/prompts";
import { addTicket, resetDemoData } from "@/lib/data/store";
import { handBack, takeOver } from "@/lib/runtime/takeover";
import { createThread, removeThread } from "@/lib/runtime/threads";
import type { SupportContext } from "@/lib/types";

let thread: ReturnType<typeof createThread>;
let context: SupportContext;
beforeEach(() => {
  resetDemoData();
  thread = createThread("c-anna");
  context = { customerId: "c-anna", customerName: "Anna", language: "en", threadId: thread.threadId };
});
afterEach(() => { removeThread(thread.threadId); resetDemoData(); });

describe("human support prompt state", () => {
  it("says an open ticket is waiting for a consultant", () => {
    const ticket = addTicket({ customerId: thread.customerId, threadId: thread.threadId, traceId: thread.traceId,
      summary: "Needs help", source: "agent", reason: "agent_request" });
    expect(buildInstructions(ORDERS_ROLE, context)).toContain(`Ticket ${ticket.id} is open and waiting for a consultant.`);
  });

  it("names the current consultant and reports the ticket closed after hand-back", () => {
    const ticket = addTicket({ customerId: thread.customerId, threadId: thread.threadId, traceId: thread.traceId,
      summary: "Needs help", source: "agent", reason: "agent_request" });
    expect(takeOver(thread.threadId, "Marta Nowak").ok).toBe(true);
    expect(buildInstructions(ORDERS_ROLE, context)).toContain(`Ticket ${ticket.id} is open and taken over by consultant Marta Nowak.`);
    expect(handBack(thread.threadId, "Marta Nowak").ok).toBe(true);
    expect(buildInstructions(ORDERS_ROLE, context)).toContain(`Ticket ${ticket.id} is closed after consultant Marta Nowak handed the conversation back.`);
  });
});
