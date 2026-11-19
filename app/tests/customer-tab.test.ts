/** The customer tab is thread-authorized and never widens a guest's verified order scope. */
import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/threads/[threadId]/customer/route";
import { resetDemoData } from "@/lib/data/store";
import { verifyGuest } from "@/lib/guest/verification";
import { createThread, removeThread } from "@/lib/runtime/threads";
import { credentialSetCookie } from "@/lib/security/thread-credential";
import { GUEST_ID } from "@/lib/types";

const threads: string[] = [];
const makeThread = (customerId = GUEST_ID) => {
  const value = createThread(customerId);
  threads.push(value.threadId);
  return value;
};
const request = (id: string, authenticated = true) => new Request(`http://localhost/api/threads/${id}/customer`, {
  headers: authenticated ? { cookie: credentialSetCookie(id, false).split(";")[0] } : {},
});
const read = async (threadId: string, authenticated = true) => GET(request(threadId, authenticated), { params: Promise.resolve({ threadId }) });

afterEach(() => { threads.splice(0).forEach(removeThread); resetDemoData(); });

describe("customer tab snapshot", () => {
  it("requires the thread cookie and hides all records for an unverified guest", async () => {
    const guest = makeThread();
    expect((await read(guest.threadId, false)).status).toBe(403);
    const response = await read(guest.threadId);
    expect(await response.json()).toEqual({ status: "unverified" });
  });

  it("limits verified guests to the order they proved", async () => {
    const guest = makeThread();
    expect(verifyGuest(guest, "1001", "anna.kowalska@example.com").status).toBe("VERIFIED");
    const data = await (await read(guest.threadId)).json();
    expect(data.customer.email).toBe("a***@example.com");
    expect(data.verification).toBe("verified_guest");
    expect(data).not.toHaveProperty("savedAddress");
    expect(data.orders.map((order: { id: string }) => order.id)).toEqual(["1001"]);
    expect(data.agentContext.activeOrderId).toBe("1001");
    expect(data.agentContext.ticketState).toBe("None");
  });

  it("shows all orders for a selected customer and masks their email", async () => {
    const selected = makeThread("c-anna");
    const data = await (await read(selected.threadId)).json();
    expect(data.customer.email).toBe("a***@example.com");
    expect(data.verification).toBe("verified_customer");
    expect(data.orders.map((order: { id: string }) => order.id)).toEqual(["1001", "1002", "1003", "1007"]);
    expect(data.orders[0].deliveredDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
