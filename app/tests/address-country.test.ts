/**
 * Address-country rules use trusted order metadata, never the model's country guess.
 * Exercise real tool proposals and Confirm so invalid stored drafts cannot bypass policy.
 */
import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it } from "vitest";
import { decideAddressChange, proposeAddressChange } from "@/lib/address/address-flow";
import { checkAddressCountry } from "@/lib/address/address-schema";
import { currentAddress, findOrderForCustomer, orders, resetDemoData } from "@/lib/data/store";
import { clearEventLog, subscribeToThread } from "@/lib/runtime/event-bus";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, type Thread } from "@/lib/runtime/threads";
import { updateAddressChange } from "@/lib/tools/address";
import type { Address, AgentEvent, SupportContext } from "@/lib/types";

const NEW = { street: "22 Elm Street", city: "Manchester", postalCode: "M1 4BT" };
const order = () => findOrderForCustomer("c-james", "1004")!;
let thread: Thread;
let ctx: SupportContext;
let events: AgentEvent[];
const call = (input: Partial<Address> = {}) => updateAddressChange.invoke(new RunContext(ctx),
  JSON.stringify({ orderId: "1004", ...NEW, country: null, ...input }));
const confirm = () => decideAddressChange(thread, "en", {
  type: "address", orderId: "1004", proposalId: thread.pendingAddress!.proposalId, decision: "confirm",
});

beforeEach(() => {
  resetDemoData();
  clearEventLog();
  thread = createThread("c-james");
  ctx = sessionContextOf(thread);
  events = [];
  subscribeToThread(thread.threadId, (event) => events.push(event));
});

describe("trusted order country", () => {
  it("each order declares a country whose format fits its original postal code", () => {
    for (const record of orders) {
      expect(["PL", "GB", "DE"]).toContain(record.deliveryCountry);
      expect(checkAddressCountry(record, record.address)).toEqual({ ok: true });
    }
  });

  it.each([
    ["PL", "02-347", "SW1A 1AA"],
    ["DE", "10115", "02-347"],
    ["GB", "SW1A 1AA", "10115"],
  ] as const)("validates %s postal codes using only order metadata", (deliveryCountry, valid, invalid) => {
    const record = { ...order(), deliveryCountry };
    expect(checkAddressCountry(record, { postalCode: valid })).toEqual({ ok: true });
    expect(checkAddressCountry(record, { postalCode: invalid })).toMatchObject({ ok: false, code: "POSTAL_CODE_COUNTRY_MISMATCH" });
  });

  it("refuses country changes even when the postal code format fits both countries", () => {
    expect(checkAddressCountry({ ...order(), deliveryCountry: "DE" }, { country: "US", postalCode: "10115" }))
      .toMatchObject({ ok: false, code: "COUNTRY_CHANGE_NOT_ALLOWED" });
  });

  it("fails closed when a stored order has no trusted country", () => {
    const record = { ...order() };
    Reflect.deleteProperty(record, "deliveryCountry");
    expect(checkAddressCountry(record, NEW)).toMatchObject({ ok: false, code: "COUNTRY_UNSUPPORTED" });
  });
});

describe("proposal policy", () => {
  it("refuses the observed Warsaw address for a GB order and offers escalation", async () => {
    ctx.language = "pl";
    const result = await call({ street: "Jasia Stasia 17/21", city: "Warszawa", postalCode: "02-347" });
    expect(result).toContain("POSTAL_CODE_COUNTRY_MISMATCH");
    expect(result).toContain("Offer escalation");
    expect(thread.pendingAddress).toBeUndefined();
    expect(events.some((event) => event.kind === "widget")).toBe(false);
  });

  it("refuses an explicit foreign country despite a valid GB postal code", async () => {
    expect(await call({ country: "PL" })).toContain("COUNTRY_CHANGE_NOT_ALLOWED");
    expect(thread.pendingAddress).toBeUndefined();
  });

  it("an invalid stored draft cannot be proposed or silently retried", async () => {
    ctx.addressDraft = { orderId: "1004", ...NEW, country: "PL" };
    expect(await call()).toContain("COUNTRY_CHANGE_NOT_ALLOWED");
    expect(thread.pendingAddress).toBeUndefined();
    expect(proposeAddressChange(thread, { orderId: "1004", ...NEW, postalCode: "02-347" }))
      .toMatchObject({ ok: false, code: "POSTAL_CODE_COUNTRY_MISMATCH" });
    expect(events.some((event) => event.kind === "widget")).toBe(false);
  });

  it("bad new input invalidates an older valid card; correcting it permits a new proposal", async () => {
    await call();
    expect(thread.pendingAddress).toBeDefined();
    expect(await call({ country: "PL" })).toContain("COUNTRY_CHANGE_NOT_ALLOWED");
    expect(thread.pendingAddress).toBeUndefined();
    expect(await call({ country: "gb" })).toContain("CONFIRMATION_SHOWN");
    expect(confirm()).toContain("will now be delivered");
    expect(currentAddress(order())).toMatchObject({ ...NEW, country: "GB" });
  });
});

describe("Confirm revalidation", () => {
  it.each([
    { postalCode: "02-347" },
    { country: "PL" },
    { street: "x" },
  ])("rejects a stored proposal corrupted with %j", async (invalid) => {
    await call();
    Object.assign(thread.pendingAddress!.newAddress, invalid);
    const reply = confirm();
    expect(reply).toContain("I could not change the address");
    expect(reply).toContain("Would you like me to pass this to a consultant?");
    expect(reply).not.toMatch(/offer escalation|collect a valid address|ask the customer|instruction:/i);
    expect(currentAddress(order())).toEqual(order().address);
    expect(thread.pendingAddress).toBeUndefined();
    expect(events.some((event) => event.kind === "address_change" && event.status === "applied")).toBe(false);
  });

  it("checks the order's current country again when Confirm arrives", async () => {
    await call();
    const record = order();
    const original = record.deliveryCountry;
    try {
      record.deliveryCountry = "PL";
      expect(confirm()).toContain("postal code must match PL");
      expect(currentAddress(record)).toEqual(record.address);
    } finally {
      record.deliveryCountry = original;
    }
  });
});
