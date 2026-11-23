/** A manager request during a consultant takeover leaves human routing and opens manager review. */
import { afterEach, expect, it, vi } from "vitest";
import { resetDemoData } from "@/lib/data/store";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, removeThread } from "@/lib/runtime/threads";
import { takeOver } from "@/lib/runtime/takeover";

const { run } = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: run }));
import { handleUserMessage } from "@/lib/runtime/turn";

const thread = createThread("c-anna");
afterEach(() => { removeThread(thread.threadId); resetDemoData(); vi.clearAllMocks(); });

it("routes a manager request to the manager queue while a consultant has taken over", async () => {
  takeOver(thread.threadId, "Marta Nowak");
  const outcome = await handleUserMessage(sessionContextOf(thread), "Can I talk to the manager?");
  expect(outcome.reply).toContain("kierownikowi");
  expect(thread.takeover.status).toBe("agent");
  expect(thread.transcript.at(-1)?.role).toBe("system");
  expect(run).not.toHaveBeenCalled();
});
