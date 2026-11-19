import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDemoData } from "@/lib/data/store";
import { maskSensitiveText, normalizeInput, stripInvisible } from "@/lib/guardrails/normalize-input";
import { clearEventLog, readEventLog, subscribeToThread } from "@/lib/runtime/event-bus";
import type { RunOutcome } from "@/lib/runtime/run-support";
import type { AgentEvent, SupportContext } from "@/lib/types";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");

const DIGITS = /1090|1014|0712|1981|2874/;

beforeEach(() => {
  resetDemoData();
  clearEventLog();
  model.run.mockReset();
  model.run.mockResolvedValue({ reply: "ok", approvals: [] } satisfies RunOutcome);
});

describe("IBAN masking does not depend on the separator", () => {
  it.each([
    ["spaces", "PL61 1090 1014 0000 0712 1981 2874"],
    ["dots", "PL61.1090.1014.0000.0712.1981.2874"],
    ["slashes", "PL61/1090/1014/0000/0712/1981/2874"],
    ["dashes", "PL61-1090-1014-0000-0712-1981-2874"],
    ["a mix", "PL61 1090.1014/0000-0712 1981.2874"],
    ["no-break spaces", "PL61 1090 1014 0000 0712 1981 2874"],
    ["a bare Polish number with dots", "61.1090.1014.0000.0712.1981.2874"],
    ["a bare Polish number with slashes", "61/1090/1014/0000/0712/1981/2874"],
    ["no separator", "PL61109010140000071219812874"],
  ])("masks an IBAN written with %s", (_name, iban) => {
    const result = normalizeInput(`Refund to ${iban}, thanks`);
    expect(result.sensitive.iban).toBe(1);
    expect(result.text).toBe("Refund to [bank account number removed], thanks");
  });

  it("does not eat ordinary dotted text around it", () => {
    const text = "Order 1001 arrived on 12.11.2026, version 1.2.3, price 3200.50 PLN";
    expect(maskSensitiveText(text).text).toBe(text);
  });
});

describe("the panel's 'before' text never shows digits hidden behind invisible characters", () => {
  const PROBE = "P​L61 1090 1014 0000 0712 1981 2874";
  const ctx: SupportContext = { customerId: "c-anna", customerName: "Anna Kowalska", language: "en", threadId: "thread-invisible-probe" };

  it("stripInvisible removes zero-width, bidi and BOM characters", () => {
    expect(stripInvisible("a​b‮c﻿d")).toBe("abcd");
  });

  it("the exact probe 'P<ZWSP>L61 1090 ... 2874' leaves no digits in any event or in what the model reads", async () => {
    const events: AgentEvent[] = [];
    subscribeToThread(ctx.threadId, (e) => events.push(e));
    await handleUserMessage(ctx, `Please refund to ${PROBE}`);
    expect(JSON.stringify(model.run.mock.calls[0][0])).not.toMatch(DIGITS);
    expect(JSON.stringify(events)).not.toMatch(DIGITS);
    expect(JSON.stringify(readEventLog())).not.toMatch(DIGITS);
    const cleanup = events.find((e) => e.kind === "normalization");
    expect(cleanup).toMatchObject({ stripped: expect.arrayContaining([expect.stringContaining("invisible")]) });
  });
});
