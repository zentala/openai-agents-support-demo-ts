/**
 * Agents SDK order tools expose the owner's current delivery address.
 * Invoke the real tools to check changed addresses and session access boundaries.
 */
import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDemoData, setDeliveryAddress } from "@/lib/data/store";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread } from "@/lib/runtime/threads";
import { unwrapData } from "@/lib/tools/helpers";
import { getOrder, listMyOrders } from "@/lib/tools/orders";

const runFor = (customerId: string) => new RunContext(sessionContextOf(createThread(customerId)));
const readOrder = (customerId: string, orderId = "1004") =>
  getOrder.invoke(runFor(customerId), JSON.stringify({ orderId }));

beforeEach(() => resetDemoData());

describe("owner's delivery address", () => {
  it("returns the original address through both order tools", async () => {
    const address = { street: "14 Baker Lane", city: "London", postalCode: "SW1A 1AA" };
    expect(unwrapData(await readOrder("c-james"))).toMatchObject({ orderId: "1004", address });
    expect(unwrapData(await listMyOrders.invoke(runFor("c-james"), "{}")))
      .toEqual(expect.arrayContaining([expect.objectContaining({ orderId: "1004", address })]));
  });

  it("returns the confirmed address rather than the original through both tools", async () => {
    const address = { street: "22 Elm Street", city: "Manchester", postalCode: "M1 4BT" };
    setDeliveryAddress("1004", address);
    expect(unwrapData(await readOrder("c-james"))).toMatchObject({ address });
    expect(unwrapData(await listMyOrders.invoke(runFor("c-james"), "{}")))
      .toEqual(expect.arrayContaining([expect.objectContaining({ orderId: "1004", address })]));
  });

  it("refuses foreign orders and never includes them in the owner's list", async () => {
    expect(unwrapData(await readOrder("c-anna"))).toEqual({ error: "ORDER_NOT_FOUND", orderId: "1004" });
    const listed = await listMyOrders.invoke(runFor("c-anna"), "{}");
    expect(listed).not.toMatch(/14 Baker Lane|London|SW1A|1004/);
  });

  it("reveals no address to an unverified guest through either tool", async () => {
    for (const result of [await readOrder("guest"), await listMyOrders.invoke(runFor("guest"), "{}")]) {
      expect(result).toContain("NOT_VERIFIED");
      expect(result).not.toMatch(/14 Baker Lane|London|SW1A/);
    }
  });
});
