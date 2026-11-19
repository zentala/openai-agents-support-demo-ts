/** Real HTTP handler checks for conversation credentials, event visibility and malformed widget clicks. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import { CUSTOMER_EVENT_KINDS, toCustomerEvent } from "@/lib/runtime/event-visibility";
import { credentialCookieName, credentialSetCookie, verifyCredential } from "@/lib/security/thread-credential";
import type { AgentEvent } from "@/lib/types";

// The model run is the only fake: the chat route, the credential gate and the event bus are real.
const turn = vi.hoisted(() => ({ handle: vi.fn() }));
vi.mock("@/lib/runtime/turn", () => ({ handleUserMessage: turn.handle }));

const { POST: createThreadRoute } = await import("@/app/api/threads/route");
const { POST: chatRoute } = await import("@/app/api/chat/route");
const { GET: customerStream } = await import("@/app/api/threads/[threadId]/stream/route");
const { GET: inspectorStream } = await import("@/app/api/admin/inspector/[threadId]/stream/route");

const params = (threadId: string) => ({ params: Promise.resolve({ threadId }) });
const cookieValue = (setCookie: string) => setCookie.split(";")[0].split("=").slice(1).join("=");

/** Opens a thread through the real route; returns its id and the cookie header the browser would send. */
async function openThread(customerId = "c-james") {
  const response = await createThreadRoute(
    new Request("http://demo.local/api/threads", { method: "POST", body: JSON.stringify({ customerId }) }),
  );
  const { threadId } = (await response.json()) as { threadId: string };
  const setCookie = response.headers.get("set-cookie") ?? "";
  return { response, threadId, setCookie, cookie: `${credentialCookieName(threadId)}=${cookieValue(setCookie)}` };
}

const chatRequest = (threadId: string, cookie?: string, selection?: Record<string, unknown>) =>
  new Request("http://demo.local/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ threadId, messages: [{ role: "user", parts: [{ type: "text", text: "hello" }] }], selection }),
  });

/** Reads an SSE response to its end (the caller aborts the request first) and returns the parsed events. */
async function drain(response: Response): Promise<AgentEvent[]> {
  const text = await response.text();
  return text.split("\n").filter((line) => line.startsWith("data: ")).map((line) => JSON.parse(line.slice(6)) as AgentEvent);
}

async function streamKinds(route: typeof customerStream, threadId: string, cookie: string | undefined, emit: () => void) {
  const controller = new AbortController();
  const response = await route(
    new Request(`http://demo.local/stream`, { headers: cookie ? { cookie } : {}, signal: controller.signal }),
    params(threadId),
  );
  if (response.status !== 200) return { status: response.status, events: [] as AgentEvent[] };
  emit();
  controller.abort();
  return { status: 200, events: await drain(response) };
}

const internalEmits = (threadId: string) => () => {
  emitAgentEvent(threadId, { kind: "tool_call", agent: "Orders & Refunds Agent", tool: "get_order", args: { orderId: "1004" } });
  emitAgentEvent(threadId, { kind: "tool_output", agent: "Orders & Refunds Agent", tool: "get_order", result: { email: "james.carter@example.com" } });
  emitAgentEvent(threadId, { kind: "kb_hits", query: "q", hits: [] });
  emitAgentEvent(threadId, { kind: "guardrail", stage: "input", name: "jailbreak_guardrail", passed: true, reasoning: "secret reasoning" });
  emitAgentEvent(threadId, { kind: "trace", traceId: "trace_1", url: "https://example.test/trace" });
  emitAgentEvent(threadId, { kind: "chat_message", entryId: "e1", role: "consultant", text: "Hello from Marta", author: "Marta" });
  emitAgentEvent(threadId, { kind: "takeover", status: "human", consultant: "Marta", note: "ticket T-2001 internal note" });
};

beforeEach(() => {
  // Braces matter: a returned function would be run by vitest as a teardown hook (mockReset returns the mock).
  turn.handle.mockReset();
});

describe("thread credential (HMAC cookie)", () => {
  it("POST /api/threads creates the thread on the server and sets an httpOnly, SameSite=Strict cookie", async () => {
    const { response, threadId, setCookie } = await openThread();
    expect(response.status).toBe(201);
    expect(threadId).toMatch(/^[0-9a-f-]{36}$/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
  });

  it("refuses an unknown customer and accepts the guest", async () => {
    const bad = await createThreadRoute(new Request("http://demo.local/api/threads", { method: "POST", body: JSON.stringify({ customerId: "c-nobody" }) }));
    expect(bad.status).toBe(400);
    expect((await openThread("guest")).response.status).toBe(201);
  });

  it("accepts only the signature made for this very thread", async () => {
    const a = await openThread();
    const b = await openThread();
    const sigA = credentialSetCookie(a.threadId, false).split(";")[0].split("=").slice(1).join("=");
    expect(verifyCredential(a.threadId, sigA)).toBe(true);
    expect(verifyCredential(b.threadId, sigA)).toBe(false);
    expect(verifyCredential(a.threadId, `${sigA}x`)).toBe(false);
    expect(verifyCredential(a.threadId, undefined)).toBe(false);
    expect(verifyCredential(a.threadId, "")).toBe(false);
  });
});

describe("customer stream: credential and content", () => {
  it("refuses a request without the credential, with a wrong one, and with another thread's one", async () => {
    const mine = await openThread();
    const other = await openThread();
    expect((await streamKinds(customerStream, mine.threadId, undefined, () => {})).status).toBe(403);
    expect((await streamKinds(customerStream, mine.threadId, `${credentialCookieName(mine.threadId)}=forged`, () => {})).status).toBe(403);
    expect((await streamKinds(customerStream, mine.threadId, other.cookie, () => {})).status).toBe(403);
  });

  it("cannot be pre-subscribed: a thread id nobody created is refused even with a well-formed cookie", async () => {
    const forgedId = "pre-subscribed-thread-0001";
    const cookie = `${credentialCookieName(forgedId)}=${cookieValue(credentialSetCookie(forgedId, false))}`;
    expect((await streamKinds(customerStream, forgedId, cookie, () => {})).status).toBe(404);
  });

  it("with the right credential it carries ONLY customer-visible events", async () => {
    const { threadId, cookie } = await openThread();
    const { status, events } = await streamKinds(customerStream, threadId, cookie, internalEmits(threadId));
    expect(status).toBe(200);
    expect(events.map((e) => e.kind)).toEqual(["chat_message", "takeover"]);
    const raw = JSON.stringify(events);
    for (const secret of ["james.carter@example.com", "secret reasoning", "trace_1", "get_order", "internal note"]) {
      expect(raw).not.toContain(secret);
    }
  });
});

describe("chat request: credential and content", () => {
  it.each([undefined, ""])("refuses an address click with missing/empty proposalId (%s) before running the agent", async (proposalId) => {
    const { threadId, cookie } = await openThread();
    const response = await chatRoute(chatRequest(threadId, cookie, { type: "address", orderId: "1004", decision: "confirm", proposalId }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ errorType: "InvalidRequest", message: expect.stringContaining("selection.proposalId") });
    expect(turn.handle).not.toHaveBeenCalled();
  });

  it("refuses a chat request without or with a wrong credential and never runs the agent", async () => {
    const { threadId } = await openThread();
    expect((await chatRoute(chatRequest(threadId))).status).toBe(403);
    expect((await chatRoute(chatRequest(threadId, `${credentialCookieName(threadId)}=forged`))).status).toBe(403);
    expect(turn.handle).not.toHaveBeenCalled();
  });

  it("with the credential it runs the agent as the customer STORED with the thread, and streams no internal events", async () => {
    const { threadId, cookie } = await openThread("c-james");
    turn.handle.mockImplementation(async (ctx: { threadId: string }) => {
      internalEmits(ctx.threadId)();
      emitAgentEvent(ctx.threadId, { kind: "widget", widget: { type: "order-picker", prompt: "Pick one", orders: [] } });
      return { reply: "Here is your answer", approvals: [] };
    });
    const response = await chatRoute(chatRequest(threadId, cookie));
    expect(response.status).toBe(200);
    expect(turn.handle.mock.calls[0][0]).toMatchObject({ customerId: "c-james", threadId });
    const body = await response.text();
    expect(body).toContain("Here is your answer");
    expect(body).toContain("order-picker");
    for (const secret of ["james.carter@example.com", "secret reasoning", "trace_1", "get_order", "tool_call", "internal note"]) {
      expect(body).not.toContain(secret);
    }
  });
});

describe("inspector stream (Agent View)", () => {
  it("carries every event, including internal ones", async () => {
    const { threadId } = await openThread();
    const { events } = await streamKinds(inspectorStream, threadId, undefined, internalEmits(threadId));
    expect(events.map((e) => e.kind)).toEqual(["tool_call", "tool_output", "kb_hits", "guardrail", "trace", "chat_message", "takeover"]);
  });
});

describe("replay: events emitted before the stream connected", () => {
  it("a late subscriber still gets the earlier events (customer-visible ones only on the customer channel)", async () => {
    const { threadId, cookie } = await openThread();
    internalEmits(threadId)(); // everything happens BEFORE any stream exists
    const customer = await streamKinds(customerStream, threadId, cookie, () => {});
    const inspector = await streamKinds(inspectorStream, threadId, undefined, () => {});
    expect(customer.events.map((e) => e.kind)).toEqual(["chat_message", "takeover"]);
    expect(inspector.events.map((e) => e.kind)).toEqual(["tool_call", "tool_output", "kb_hits", "guardrail", "trace", "chat_message", "takeover"]);
  });
});

describe("event visibility", () => {
  it("customer-visible kinds are exactly chat messages, takeover state and widgets", () => {
    expect([...CUSTOMER_EVENT_KINDS].sort()).toEqual(["chat_message", "takeover", "widget"]);
  });

  it("drops the operator note from a takeover event", () => {
    const event = { id: "1", ts: 1, kind: "takeover", status: "human", consultant: "Marta", note: "internal" } as AgentEvent;
    expect(JSON.stringify(toCustomerEvent(event))).not.toContain("internal");
  });
});
