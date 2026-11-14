/** Customer/order projection exercises real HTTP scope, guest verification, owned selection and address Confirm. */
import { RunContext } from "@openai/agents";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/threads/[threadId]/route";
import { CustomerOrderDetails } from "@/components/customer-order";
import { customerOrderOf } from "@/lib/admin/customer-order";
import { currentAddress, findOrderForCustomer, getCustomer, resetDemoData } from "@/lib/data/store";
import { proposeAddressChange } from "@/lib/address/address-flow";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { pickMutable } from "@/lib/runtime/context-diff";
import { createThread, removeThread, type Thread } from "@/lib/runtime/threads";
import { credentialSetCookie } from "@/lib/security/thread-credential";
import { verifyCustomer } from "@/lib/tools/verify-customer";
import { getOrder, listMyOrders } from "@/lib/tools/orders";
import { clearOrderAttempts } from "@/lib/guest/order-attempts";
import { GUEST_ID, type AgentEvent } from "@/lib/types";
import customers from "@/data/customers.json";
import { customerLanguageOf } from "@/lib/client/selectors";
import { readEventLog } from "@/lib/runtime/event-bus";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");
let thread: Thread;
let other: Thread;
const cookie = (owner: Thread) => credentialSetCookie(owner.threadId, false).split(";")[0];
const read = (target = thread, owner?: Thread, query = "") => GET(new Request(`https://demo.example/api/admin/threads/${target.threadId}${query}`, {
  headers: owner ? { cookie: cookie(owner) } : {},
}), { params: Promise.resolve({ threadId: target.threadId }) });
const details = async () => (await (await read(thread, thread)).json()).customerOrder;
const pick = (orderId: string) => handleUserMessage(sessionContextOf(thread), "Pick this order", { type: "order", orderId });
beforeEach(() => {
  vi.stubEnv("PUBLIC_DEMO", "true"); vi.stubEnv("SESSION_SECRET", "synthetic-customer-order-secret");
  resetDemoData();
  clearOrderAttempts();
  thread = createThread("c-james"); other = createThread("c-james");
  model.run.mockReset().mockImplementation(async (_input, ctx) => ({ reply: "Selected your order.", approvals: [], context: pickMutable(ctx) }));
});
afterEach(() => { removeThread(thread.threadId); removeThread(other.threadId); resetDemoData(); vi.unstubAllEnvs(); });

it("reads only the thread's trusted customer profile, with explicit default address and no arbitrary order", async () => {
  const response = await read(thread, thread, "?customerId=c-anna&orderId=1001");
  expect(response.status).toBe(200);
  const view = (await response.json()).customerOrder;
  expect(view).toEqual({ status: "verified", customer: { name: "James Carter", email: "james.carter@example.com", language: "en",
    defaultAddress: { street: "14 Baker Lane", city: "London", postalCode: "SW1A 1AA", country: "GB" } }, order: null });
  expect(renderToStaticMarkup(createElement(CustomerOrderDetails, { view }))).toContain("No active order selected.");
});
it("selects and switches owned orders through the real turn path, and rejects a foreign selection", async () => {
  await pick("1004");
  expect((await details()).order).toMatchObject({ orderId: "1004", status: "in_transit", items: [{ name: "Oak coffee table", qty: 1, unitPrice: 640 }] });
  await pick("1005");
  const selected = await details();
  expect(selected.order).toMatchObject({ orderId: "1005", status: "delivered", items: [{ name: "Lund floor lamp", qty: 2, unitPrice: 90 }] });
  const failed = await pick("1001");
  expect(failed.failed).toContain("own orders");
  expect(await details()).toEqual(selected);
  thread.memory.activeOrderId = "1001";
  expect((await details()).order).toBeNull();
});
it("never reveals profile/order fields before verification, even with forged active-order memory", async () => {
  removeThread(thread.threadId); thread = createThread(GUEST_ID);
  thread.memory.activeOrderId = "1004";
  expect(await details()).toEqual({ status: "unverified" });
  const ctx = new RunContext(sessionContextOf(thread));
  const verify = (email: string) => verifyCustomer.invoke(ctx, JSON.stringify({ orderId: "1004", email, postalCode: null }));
  expect(await verify("wrong@example.com")).toContain("VERIFICATION_FAILED");
  expect(await details()).toEqual({ status: "unverified" });
  expect(await verify("james.carter@example.com")).toContain("VERIFIED");
  expect((await details()).customer.email).toBe("james.carter@example.com");
  expect(other.customerId).toBe("c-james");
  expect(other.memory.activeOrderId).toBeUndefined();
});
it("denies missing, forged and foreign same-customer cookies before projecting any data", async () => {
  for (const owner of [undefined, other]) {
    const response = await read(thread, owner);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("james.carter@example.com");
  }
  const response = await GET(new Request("https://demo.example", { headers: { cookie: cookie(thread).replace(thread.threadId, other.threadId) } }),
    { params: Promise.resolve({ threadId: other.threadId }) });
  expect(response.status).toBe(403);
  expect(await response.text()).not.toContain("Baker Lane");
});
it("shows the discussed order after real guest verification and get_order in the same run", async () => {
  removeThread(thread.threadId); thread = createThread(GUEST_ID);
  expect(customerLanguageOf([], customers, GUEST_ID)).toBeUndefined();
  // Only inference is replaced: the turn, real tools, context persistence and guarded HTTP read run normally.
  model.run.mockImplementationOnce(async (_input, session) => {
    const ctx = new RunContext(session);
    expect(await verifyCustomer.invoke(ctx, JSON.stringify({ orderId: "#1004", email: "james.carter@example.com", postalCode: null }))).toContain("VERIFIED");
    expect(ctx.context.activeOrderId).toBe("1004");
    expect(thread.memory.activeOrderId).toBe("1004");
    expect(await getOrder.invoke(ctx, JSON.stringify({ orderId: "1004" }))).toContain("Oak coffee table");
    return { reply: "Here is your order.", approvals: [], context: pickMutable(session) };
  });
  await handleUserMessage(sessionContextOf(thread), "My order is 1004, james.carter@example.com");
  expect(thread.memory.activeOrderId).toBe("1004");
  const view = await details();
  const events = readEventLog().filter((entry) => entry.threadId === thread.threadId).map((entry) => entry.event);
  expect(customerLanguageOf(events, customers, GUEST_ID)).toBe("en");
  expect(view.customer.name).toBe("James Carter");
  expect(view.order).toMatchObject({ orderId: "1004", items: [{ name: "Oak coffee table" }] });
});
it("language uses only public metadata selected by trusted verification, not model context or a guessed profile", () => {
  const context: AgentEvent = { id: "model-context", ts: 0, kind: "context_update", changes: { language: { from: null, to: "pl" } } };
  expect(customerLanguageOf([context], customers, GUEST_ID)).toBeUndefined();
  expect(customerLanguageOf([], customers, "c-anna")).toBe("pl");
  const unknown: AgentEvent = { id: "verification", ts: 1, kind: "verification", outcome: "verified", customerId: "unknown-profile", customerName: "Unknown" };
  expect(customerLanguageOf([unknown], customers, "c-anna")).toBeUndefined();
});
it("owned reads switch canonical order in both contexts; foreign/unknown reads and lists cannot replace it", async () => {
  const ctx = new RunContext(sessionContextOf(thread));
  const readOrder = (orderId: string) => getOrder.invoke(ctx, JSON.stringify({ orderId }));
  await listMyOrders.invoke(ctx, "{}");
  expect(ctx.context.activeOrderId).toBeUndefined(); expect(thread.memory.activeOrderId).toBeUndefined();
  expect(await readOrder("#1004")).toContain("Oak coffee table");
  expect(ctx.context.activeOrderId).toBe("1004"); expect(thread.memory.activeOrderId).toBe("1004");
  expect(await readOrder(" 1005 ")).toContain("Lund floor lamp");
  expect(ctx.context.activeOrderId).toBe("1005"); expect(thread.memory.activeOrderId).toBe("1005");
  for (const orderId of ["1001", "unknown"]) expect(await readOrder(orderId)).toContain("ORDER_NOT_FOUND");
  await listMyOrders.invoke(ctx, "{}");
  expect(ctx.context.activeOrderId).toBe("1005"); expect(thread.memory.activeOrderId).toBe("1005");
  expect((await details()).order.orderId).toBe("1005");
});
it("failed verification and unverified reads never set an active order, and re-verification cannot switch it", async () => {
  removeThread(thread.threadId); thread = createThread(GUEST_ID);
  const ctx = new RunContext(sessionContextOf(thread));
  const verify = (orderId: string, email: string) => verifyCustomer.invoke(ctx, JSON.stringify({ orderId, email, postalCode: null }));
  expect(await verify("1001", "james.carter@example.com")).toContain("VERIFICATION_FAILED");
  expect(await getOrder.invoke(ctx, JSON.stringify({ orderId: "1004" }))).toContain("NOT_VERIFIED");
  expect(ctx.context.activeOrderId).toBeUndefined(); expect(thread.memory.activeOrderId).toBeUndefined();
  expect(await verify("#1004", "james.carter@example.com")).toContain("VERIFIED");
  expect(await verify("1001", "anna.kowalska@example.com")).toContain("ALREADY_VERIFIED");
  expect(ctx.context.activeOrderId).toBe("1004"); expect(thread.memory.activeOrderId).toBe("1004");
  expect((await details()).order.orderId).toBe("1004");
});
it("Confirm changes only the current delivery address, leaving the explicit default profile unchanged", async () => {
  await pick("1004");
  const next = { street: "27 River Road", city: "London", postalCode: "SW1A 2AA" };
  expect(proposeAddressChange(thread, { ...next, orderId: "1004" }).ok).toBe(true);
  expect((await details()).order.deliveryAddress.street).toBe("14 Baker Lane");
  await handleUserMessage(sessionContextOf(thread), "Confirm", { type: "address", orderId: "1004", proposalId: thread.pendingAddress!.proposalId, decision: "confirm" });
  const view = await details();
  expect(view.order.deliveryAddress).toEqual({ ...next, country: "GB" });
  expect(view.customer.defaultAddress.street).toBe("14 Baker Lane");
  const html = renderToStaticMarkup(createElement(CustomerOrderDetails, { view }));
  for (const label of ["Default address", "14 Baker Lane", "Current delivery address", "27 River Road", "In transit", "Oak coffee table", "640", "GB"]) expect(html).toContain(label);
  expect(currentAddress(findOrderForCustomer("c-james", "1004")!).street).toBe(next.street);
});
it("missing default address stays unrecorded, even when an owned order has an address", () => {
  const customer = getCustomer("c-james")!;
  const saved = customer.defaultAddress;
  try {
    delete customer.defaultAddress;
    thread.memory.activeOrderId = "1004";
    const view = customerOrderOf(thread);
    expect(view.status === "verified" && view.customer.defaultAddress).toBeUndefined();
    const html = renderToStaticMarkup(createElement(CustomerOrderDetails, { view }));
    expect(html).toContain("Not recorded"); expect(html).toContain("14 Baker Lane");
  } finally { customer.defaultAddress = saved; }
});
it("renders only the verification instruction for an unverified guest", () => {
  const html = renderToStaticMarkup(createElement(CustomerOrderDetails, { view: { status: "unverified" } }));
  expect(html).toContain("Verify the guest");
  for (const text of ["Email", "Default address", "Active order", "James", "Baker Lane"]) expect(html).not.toContain(text);
});
