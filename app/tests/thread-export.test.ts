/** The inspector export uses inspector access scope and scrubs credentials and secure-form values. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/inspector/[threadId]/export/route";
import { sanitizeDiagnostics } from "@/lib/runtime/diagnostics-export";
import { resetDemoData } from "@/lib/data/store";
import { clearEventLog, emitAgentEvent } from "@/lib/runtime/event-bus";
import { removeThread, createThread, addTranscript } from "@/lib/runtime/threads";
import { credentialSetCookie } from "@/lib/security/thread-credential";
import { storeSecret } from "@/lib/sensitive/vault";

const threads: string[] = [];
const thread = () => {
  const value = createThread("c-anna");
  threads.push(value.threadId);
  return value;
};
const request = (id: string, authenticated: boolean) => new Request(`http://localhost/api/admin/inspector/${id}/export`, {
  headers: authenticated ? { cookie: credentialSetCookie(id, false).split(";")[0] } : {},
});

afterEach(() => {
  threads.splice(0).forEach(removeThread);
  resetDemoData();
  clearEventLog();
  vi.unstubAllEnvs();
});

describe("thread diagnostics export", () => {
  it("refuses an unowned thread in public visitor mode", async () => {
    vi.stubEnv("PUBLIC_DEMO", "true");
    vi.stubEnv("SESSION_SECRET", "synthetic-inspector-export-secret");
    const current = thread();
    const response = await GET(request(current.threadId, false), { params: Promise.resolve({ threadId: current.threadId }) });
    expect(response.status).toBe(403);
  });

  it("exports full inspector events in local staff mode without a customer cookie and scrubs secrets", async () => {
    const current = thread();
    const keyText = ["s", "k"].join("") + "-" + ["proj", "synthetic", "value1234"].join("-");
    const iban = "PL61109010140000071219812874";
    storeSecret(current.threadId, "iban", iban);
    addTranscript(current, { role: "customer", text: `My secure form has the bank account ${iban}.` });
    emitAgentEvent(current.threadId, { kind: "tool_output", agent: "Test", tool: "secure_form", result: {
      note: `provider sent ${keyText}`, iban, apiKey: keyText, sessionSecret: "<REDACTED>", cookie: "<REDACTED>",
    } });
    const response = await GET(request(current.threadId, false), { params: Promise.resolve({ threadId: current.threadId }) });
    const text = await response.text();
    const exported = JSON.parse(text) as { thread: { traceId: string }; events: { kind: string }[] };
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-disposition")).toContain(`nordic-home-${current.threadId}-`);
    expect(exported.thread.traceId).toBe(current.traceId);
    expect(exported.events.some((event) => event.kind === "tool_output")).toBe(true);
    expect(text).not.toContain(keyText);
    expect(sanitizeDiagnostics({ note: keyText }).note).toBe("[key removed]");
    expect(text).not.toContain(iban.replaceAll("PL", ""));
    expect(text).not.toContain("<REDACTED>");
  });

  it("uses the inspector's public visitor scope rather than accepting another thread cookie", async () => {
    vi.stubEnv("PUBLIC_DEMO", "true");
    vi.stubEnv("SESSION_SECRET", "synthetic-inspector-export-secret");
    const owned = thread();
    const foreign = thread();
    const response = await GET(request(owned.threadId, false), { params: Promise.resolve({ threadId: owned.threadId }) });
    expect(response.status).toBe(403);
    const wrong = new Request(`http://localhost/api/admin/inspector/${owned.threadId}/export`, {
      headers: { cookie: credentialSetCookie(foreign.threadId, false).split(";")[0] },
    });
    expect((await GET(wrong, { params: Promise.resolve({ threadId: owned.threadId }) })).status).toBe(403);
  });
});
