/** Address proposals are inert until a click names the exact current proposal. */
import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkAddressChangeAllowed, sameAddress } from "@/lib/address/address-schema";
import { mergeAddressFields, type AddressFields } from "@/lib/address/address-flow";
import { currentAddress, findOrderForCustomer, orders, resetDemoData } from "@/lib/data/store";
import { clearEventLog, subscribeToThread } from "@/lib/runtime/event-bus";
import type { RunOutcome } from "@/lib/runtime/run-support";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, type Thread } from "@/lib/runtime/threads";
import { updateAddressChange } from "@/lib/tools/address";
import type { AgentEvent, SupportContext } from "@/lib/types";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");

const none: AddressFields = { orderId: null, street: null, city: null, postalCode: null };
const NEW = { street: "22 Elm Street", city: "Manchester", postalCode: "M1 4BT" };
const confirm = () => ({ type: "address", orderId: "1004", proposalId: thread.pendingAddress?.proposalId ?? "missing-proposal", decision: "confirm" } as const);
const cancel = () => ({ ...confirm(), decision: "cancel" } as const);

let thread: Thread;
let ctx: SupportContext;
let events: AgentEvent[];

const call = (args: Partial<AddressFields>, session = ctx) =>
  updateAddressChange.invoke(new RunContext(session), JSON.stringify({ ...none, ...args }));
const order1004 = () => findOrderForCustomer("c-james", "1004")!;

/** Fills every slot through the real tool, leaving a proposal on the thread. */
async function propose() {
  await call({ orderId: "1004" });
  await call({ street: NEW.street });
  await call({ city: NEW.city });
  return call({ postalCode: NEW.postalCode });
}

beforeEach(() => {
  resetDemoData();
  clearEventLog();
  model.run.mockReset();
  model.run.mockResolvedValue({ reply: "model answer", approvals: [] } satisfies RunOutcome);
  thread = createThread("c-james");
  ctx = sessionContextOf(thread);
  events = [];
  subscribeToThread(thread.threadId, (e) => events.push(e));
});

describe("which orders may change address, and which values are valid", () => {
  it("only an order still in transit can change; a delivered one is refused with the reason", () => {
    expect(checkAddressChangeAllowed(order1004())).toEqual({ ok: true });
    expect(checkAddressChangeAllowed(findOrderForCustomer("c-james", "1005"))).toMatchObject({ ok: false, code: "ORDER_DELIVERED" });
    expect(checkAddressChangeAllowed(undefined)).toMatchObject({ ok: false, code: "ORDER_NOT_FOUND" });
  });

  it("rejects someone else's order, a delivered order and badly formatted fields", () => {
    expect(mergeAddressFields("c-anna", {}, { ...none, orderId: "1004" }).rejected[0].code).toBe("ORDER_NOT_FOUND");
    expect(mergeAddressFields("c-james", {}, { ...none, orderId: "1005" }).rejected[0].code).toBe("ORDER_DELIVERED");
    const bad = mergeAddressFields("c-james", {}, { ...none, street: "x", city: "M", postalCode: "!!" });
    expect(bad.rejected.map((r) => r.field)).toEqual(["street", "city", "postalCode"]);
    expect(bad.draft).toEqual({});
  });
});

describe("update_address_change: one question at a time, then a proposal - never the change itself", () => {
  it("asks for the street, then the city, then the postal code", async () => {
    expect(await call({ orderId: "1004" })).toContain("street and house number");
    expect(await call({ street: NEW.street })).toContain("In which city?");
    expect(await call({ city: NEW.city })).toContain("postal code");
    expect(ctx.addressDraft).toEqual({ orderId: "1004", ...NEW, postalCode: undefined });
  });

  it("when complete it shows the old-vs-new card and leaves the order's address UNCHANGED", async () => {
    const original = { ...currentAddress(order1004()) };
    const result = await propose();
    expect(result).toContain("CONFIRMATION_SHOWN");
    const card = events.find((e) => e.kind === "widget");
    expect(card).toMatchObject({ widget: { type: "address-confirm", orderId: "1004", oldAddress: original, newAddress: NEW } });
    expect(sameAddress(currentAddress(order1004()), original)).toBe(true);
    expect(thread.pendingAddress).toMatchObject({ orderId: "1004", newAddress: NEW });
  });

  it("refuses a delivered order and shows no card", async () => {
    const result = await call({ orderId: "1005" });
    expect(result).toContain("ORDER_DELIVERED");
    expect(events.some((e) => e.kind === "widget")).toBe(false);
  });

  it("refuses a guest", async () => {
    const guest = sessionContextOf(createThread("guest"));
    expect(await call({ orderId: "1004" }, guest)).toContain("NOT_VERIFIED");
  });
});

describe("only the Confirm click applies the change", () => {
  it("typing 'yes, confirm' in the chat changes nothing", async () => {
    await propose();
    await handleUserMessage(ctx, "Yes, please confirm the new address now.");
    expect(sameAddress(currentAddress(order1004()), order1004().address)).toBe(true);
    expect(thread.pendingAddress).toBeDefined();
  });

  it("the Confirm click applies it with no model call and tells the customer, in the customer's language", async () => {
    await propose();
    const outcome = await handleUserMessage(ctx, "Yes, change the delivery address of order #1004.", confirm());
    expect(model.run).not.toHaveBeenCalled();
    expect(sameAddress(currentAddress(order1004()), NEW)).toBe(true);
    expect(outcome.reply).toContain("22 Elm Street, M1 4BT Manchester");
    expect(thread.pendingAddress).toBeUndefined();
    expect(events.find((e) => e.kind === "address_change" && e.status === "applied")).toBeDefined();
    expect(thread.transcript.at(-1)).toMatchObject({ role: "agent" });
  });

  it("Cancel keeps the old address", async () => {
    await propose();
    const outcome = await handleUserMessage(ctx, "No, keep the current address.", cancel());
    expect(outcome.reply).toContain("kept the current delivery address");
    expect(sameAddress(currentAddress(order1004()), order1004().address)).toBe(true);
    expect(thread.pendingAddress).toBeUndefined();
  });

  it("a second Confirm of the same proposal is refused (the proposal is used up)", async () => {
    await propose();
    await handleUserMessage(ctx, "confirm", confirm());
    const again = await handleUserMessage(ctx, "confirm", confirm());
    expect(again.reply).toContain("no pending address change");
  });

  it("a forged Confirm without a proposal, or for another order, changes nothing", async () => {
    const forged = await handleUserMessage(ctx, "confirm", confirm());
    expect(forged.reply).toContain("no pending address change");
    await propose();
    const other = await handleUserMessage(ctx, "confirm", { ...confirm(), orderId: "1005" });
    expect(other.reply).toContain("no pending address change");
    expect(sameAddress(currentAddress(order1004()), order1004().address)).toBe(true);
  });

  it("another customer's click cannot apply James's proposal", async () => {
    await propose();
    const anna = createThread("c-anna");
    const outcome = await handleUserMessage(sessionContextOf(anna), "confirm", confirm());
    expect(outcome.reply).toContain("no pending address change");
    expect(sameAddress(currentAddress(order1004()), order1004().address)).toBe(true);
  });

  it("if the order was delivered meanwhile, Confirm is refused", async () => {
    await propose();
    const order = orders.find((o) => o.id === "1004")!;
    order.status = "delivered";
    try {
      const outcome = await handleUserMessage(ctx, "confirm", confirm());
      expect(outcome.reply).toContain("already been delivered");
      expect(sameAddress(currentAddress(order), order.address)).toBe(true);
    } finally {
      order.status = "in_transit";
    }
  });
});


describe("stale cards", () => {
  it.each(["confirm", "cancel"] as const)("refuses an old %s without consuming the newest proposal", async (decision) => {
    await propose();
    const first = events.find((e) => e.kind === "widget" && e.widget.type === "address-confirm");
    if (first?.kind !== "widget" || first.widget.type !== "address-confirm") throw new Error("Missing address card");
    const stale = { type: "address" as const, orderId: first.widget.orderId, proposalId: first.widget.proposalId, decision };
    await call({ orderId: "1004", ...NEW, street: "44 Pine Street" });
    const latest = thread.pendingAddress!;
    expect(latest.proposalId).not.toBe(stale.proposalId);
    const outcome = await handleUserMessage(ctx, "old card click", stale);
    expect(outcome.reply).toContain("card is stale");
    expect(thread.pendingAddress).toBe(latest);
    expect(sameAddress(currentAddress(order1004()), order1004().address)).toBe(true);
    const applied = await handleUserMessage(ctx, "latest card click", confirm());
    expect(applied.reply).toContain("44 Pine Street");
    expect(currentAddress(order1004()).street).toBe("44 Pine Street");
  });
});
