/**
 * Two edges of the address change that had no test: Stop (the customer abandons the request) and the
 * REFUSED tool result of a complete draft. Real tool, real thread and event log; no model.
 */
import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it } from "vitest";
import { dropAddressFlowOnStop, proposeAddressChange } from "@/lib/address/address-flow";
import { resetDemoData } from "@/lib/data/store";
import { clearEventLog, readEventLog } from "@/lib/runtime/event-bus";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread } from "@/lib/runtime/threads";
import { updateAddressChange } from "@/lib/tools/address";

const empty = { orderId: null, street: null, city: null, postalCode: null, country: null };
const manchester = { street: "22 Elm Street", city: "Manchester", postalCode: "M1 4BT", country: null };
beforeEach(() => { resetDemoData(); clearEventLog(); });

const events = () => readEventLog().map(({ event }) => event);
const lastSlotsOutcome = () => events().filter((e) => e.kind === "slots").at(-1);

describe("Stop during an address change", () => {
  it("drops the draft and marks the slots card as stopped instead of pending", () => {
    const thread = createThread("c-james");
    thread.memory.addressDraft = { orderId: "1004", street: "22 Elm Street" };

    dropAddressFlowOnStop(thread);

    expect(thread.memory.addressDraft).toBeUndefined();
    expect(lastSlotsOutcome()).toMatchObject({ kind: "slots", form: "address-change", outcome: "Stopped by the customer" });
  });

  it("withdraws a confirmation card created by the stopped request", () => {
    const thread = createThread("c-james");
    expect(proposeAddressChange(thread, { orderId: "1004", ...manchester, country: undefined } as never)).toEqual({ ok: true });
    expect(thread.pendingAddress).toBeDefined();

    dropAddressFlowOnStop(thread);

    expect(thread.pendingAddress).toBeUndefined();
    expect(events().some((e) => e.kind === "address_change" && e.status === "cancelled" && e.detail === "Stopped by the customer")).toBe(true);
  });

  it("keeps a card that existed before the stopped request", () => {
    const thread = createThread("c-james");
    proposeAddressChange(thread, { orderId: "1004", ...manchester, country: undefined } as never);
    const before = thread.pendingAddress!.proposalId;
    clearEventLog();

    dropAddressFlowOnStop(thread, before);

    expect(thread.pendingAddress?.proposalId).toBe(before);
    expect(events()).toEqual([]);
  });

  it("does nothing when no address change is in progress", () => {
    const thread = createThread("c-james");
    dropAddressFlowOnStop(thread);
    expect(events()).toEqual([]);
  });
});

describe("REFUSED result of update_address_change for a complete draft", () => {
  it("an already delivered order is refused: no card, no proposal, draft cleared", async () => {
    const thread = createThread("c-james");
    const ctx = sessionContextOf(thread);
    const raw = await updateAddressChange.invoke(new RunContext(ctx), JSON.stringify({ ...empty, orderId: "1005", ...manchester }));

    expect(raw).toContain("REFUSED");
    expect(raw).toContain("ORDER_DELIVERED");
    expect(raw).not.toContain("CONFIRMATION_SHOWN");
    expect(thread.pendingAddress).toBeUndefined();
    expect(ctx.addressDraft).toBeUndefined();
    expect(events().some((e) => e.kind === "widget" || (e.kind === "address_change" && e.status === "proposed"))).toBe(false);
  });
});
