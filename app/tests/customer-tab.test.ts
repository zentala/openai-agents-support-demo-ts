/** Customer tab selection states stay useful before a message or thread is ready. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/threads/[threadId]/customer/route";
import { CustomerTab } from "@/components/admin/customer-tab";
import { addTicket, resetDemoData } from "@/lib/data/store";
import { verifyGuest } from "@/lib/guest/verification";
import { createThread, removeThread } from "@/lib/runtime/threads";
import { credentialSetCookie } from "@/lib/security/thread-credential";
import { GUEST_ID, type AgentEvent } from "@/lib/types";

const events: AgentEvent[] = [];
const threads: string[] = [];
const makeThread = (customerId = GUEST_ID) => {
  const thread = createThread(customerId);
  threads.push(thread.threadId);
  return thread;
};
const request = (id: string, authenticated = true) => new Request(`http://localhost/api/threads/${id}/customer`, {
  headers: authenticated ? { cookie: credentialSetCookie(id, false).split(";")[0] } : {},
});
const read = async (threadId: string, authenticated = true) => GET(request(threadId, authenticated), { params: Promise.resolve({ threadId }) });

afterEach(() => { threads.splice(0).forEach(removeThread); resetDemoData(); });

it("shows the selected customer's loading state before the first message", () => {
  const html = renderToStaticMarkup(createElement(CustomerTab, {
    threadId: null,
    selectedCustomerId: "c-anna",
    events,
  }));

  expect(html).toContain("Loading customer information…");
  expect(html).not.toContain("Start a conversation to see customer information");
});

it("keeps the guest unverified notice visible before a thread is ready", () => {
  const html = renderToStaticMarkup(createElement(CustomerTab, {
    threadId: null,
    selectedCustomerId: GUEST_ID,
    events,
  }));

  expect(html).toContain("Not verified yet.");
});

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

  it("returns ticket metadata only and never exposes staff drafts, reasons or reported text", async () => {
    const selected = makeThread("c-anna");
    const privateText = ["Blocked staff draft: rude wording", "Manager lockout reason: three blocked drafts", "Consultant escalation reason: internal note", "Reported answer: confidential quote"];
    addTicket({ customerId: selected.customerId, threadId: selected.threadId, traceId: selected.traceId,
      summary: privateText[0], source: "rule", reason: privateText[1], category: "manager_review" });
    addTicket({ customerId: selected.customerId, threadId: selected.threadId, traceId: selected.traceId,
      summary: privateText[2], source: "rule", reason: privateText[2], category: "manager_requested" });
    addTicket({ customerId: selected.customerId, threadId: selected.threadId, traceId: selected.traceId,
      summary: privateText[3], source: "rule", reason: privateText[3], category: "message_report" });

    const data = await (await read(selected.threadId)).json();
    expect(data.tickets).toHaveLength(3);
    expect(data.tickets[0]).toEqual(expect.objectContaining({ category: "manager_review", status: "open" }));
    for (const ticket of data.tickets) expect(Object.keys(ticket).sort()).toEqual(["category", "createdAt", "id", "status"]);
    for (const text of privateText) expect(JSON.stringify(data)).not.toContain(text);
  });
});
