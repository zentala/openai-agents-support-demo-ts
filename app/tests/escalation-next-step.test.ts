/**
 * Escalation records a queue entry, not an outbound call, contact promise or takeover.
 * Real tool and deterministic turn tests check exactly what the customer can do next.
 */
import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listTickets, resetDemoData } from "@/lib/data/store";
import { clearEventLog } from "@/lib/runtime/event-bus";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread } from "@/lib/runtime/threads";
import { escalateToHuman } from "@/lib/tools/kb-and-escalation";
import { unwrapData } from "@/lib/tools/helpers";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");

beforeEach(() => {
  resetDemoData();
  clearEventLog();
  model.run.mockReset();
});

describe("escalation next action", () => {
  it("the tool tells the model the real next action for new and already-open tickets", async () => {
    const thread = createThread("c-james");
    const run = new RunContext(sessionContextOf(thread));
    const first = unwrapData(await escalateToHuman.invoke(run, '{"summary":"Missing policy answer"}'));
    expect(first).toMatchObject({
      status: "TICKET_CREATED", queueStatus: "waiting_for_consultant",
      nextStep: "A consultant can take over this conversation and reply here. You can keep this chat open.",
      outboundContactScheduled: false, responseTime: null,
    });
    const again = unwrapData(await escalateToHuman.invoke(run, '{"summary":"Still unresolved"}'));
    expect(again).toMatchObject({ ...(first as object), status: "TICKET_ALREADY_OPEN" });
    expect(listTickets()).toHaveLength(1);
    expect(thread.takeover.status).toBe("agent");
  });

  it.each([
    ["en", "A consultant can take over this conversation and reply here. You can keep this chat open."],
    ["pl", "Konsultant może przejąć tę rozmowę i odpowiedzieć tutaj. Możesz zostawić ten czat otwarty."],
    ["de", "Ein Mitarbeiter kann dieses Gespräch übernehmen und hier antworten. Sie können diesen Chat geöffnet lassen."],
  ])("the actual rule reply and transcript explain the next step in %s, without contact promises", async (language, nextStep) => {
    const thread = createThread("c-james");
    const ctx = { ...sessionContextOf(thread), language };
    for (let turn = 0; turn < 2; turn++) {
      const outcome = await handleUserMessage(ctx, "I want to talk to a human.");
      expect(outcome.reply).toContain(nextStep);
      expect(outcome.reply).not.toMatch(/will contact|will get back|as soon|e-?mail|phone|Skontaktuje|Odezwie|meldet sich/i);
      expect(thread.transcript.at(-1)).toMatchObject({ role: "system", text: outcome.reply });
    }
    expect(listTickets()).toHaveLength(1);
    expect(thread.takeover.status).toBe("agent");
    expect(model.run).not.toHaveBeenCalled();
  });
});
