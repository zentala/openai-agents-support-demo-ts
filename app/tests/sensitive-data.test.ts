import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listRefunds, resetDemoData } from "@/lib/data/store";
import { detectLeak } from "@/lib/guardrails/leak-detect";
import { maskSensitiveText, normalizeInput } from "@/lib/guardrails/normalize-input";
import { clearEventLog, readEventLog, subscribeToThread } from "@/lib/runtime/event-bus";
import type { RunOutcome } from "@/lib/runtime/run-support";
import { isValidIban } from "@/lib/sensitive/iban";
import { isValidPhone } from "@/lib/sensitive/phone";
import { getSecret, MAX_SUBMISSIONS_PER_THREAD, storeSecret } from "@/lib/sensitive/vault";
import { credentialCookieName, credentialSetCookie } from "@/lib/security/thread-credential";
import { createRefund } from "@/lib/tools/refund";
import { checkPayout } from "@/lib/tools/refund-payout";
import { requestBankAccount } from "@/lib/tools/secure-forms";
import { findOrderForCustomer } from "@/lib/data/store";
import type { AgentEvent, SupportContext } from "@/lib/types";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");
const { POST: createThreadRoute } = await import("@/app/api/threads/route");
const { POST: secureFormRoute } = await import("@/app/api/threads/[threadId]/secure-form/route");

const IBAN = "PL61 1090 1014 0000 0712 1981 2874";
const IBAN_COMPACT = "PL61109010140000071219812874";
const PHONE = "+48 600 100 200";

beforeEach(() => {
  resetDemoData();
  clearEventLog();
  model.run.mockReset();
  model.run.mockResolvedValue({ reply: "ok", approvals: [] } satisfies RunOutcome);
});

describe("IBAN and phone validation", () => {
  it("accepts a correct IBAN in any spacing and case, refuses a wrong checksum or length", () => {
    expect(isValidIban(IBAN)).toBe(true);
    expect(isValidIban(IBAN_COMPACT.toLowerCase())).toBe(true);
    expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(isValidIban("PL61 1090 1014 0000 0712 1981 2875")).toBe(false); // last digit changed
    expect(isValidIban("PL61 1090 1014 0000 0712 1981")).toBe(false); // too short for Poland
    expect(isValidIban("not an iban")).toBe(false);
    expect(isValidIban("")).toBe(false);
  });

  it("accepts phone numbers with 9-15 digits and refuses letters or too few digits", () => {
    for (const ok of [PHONE, "600 100 200", "600-100-200", "(22) 123 45 67", "0044 20 7946 0958"]) expect(isValidPhone(ok), ok).toBe(true);
    for (const bad of ["12345", "call me maybe", "+48 600 100 20x", "1234567890123456", ""]) expect(isValidPhone(bad), bad).toBe(false);
  });
});

describe("masking sensitive values typed into the chat", () => {
  it("masks an IBAN in every spelling (spaced, compact, bare Polish digits, even with a typo)", () => {
    for (const text of [IBAN, IBAN_COMPACT, "61 1090 1014 0000 0712 1981 2874", "PL61 1090 1014 0000 0712 1981 2875"]) {
      const masked = maskSensitiveText(`My account: ${text} thanks`);
      expect(masked.sensitive.iban, text).toBe(1);
      expect(masked.text).toBe("My account: [bank account number removed] thanks");
    }
  });

  it("masks phone numbers but leaves order numbers, amounts and dates alone", () => {
    expect(maskSensitiveText(`Call me on ${PHONE}`).text).toBe("Call me on [phone number removed]");
    expect(maskSensitiveText("600-100-200").sensitive.phone).toBe(1);
    const harmless = "Order #1001 costs 3200 PLN, delivered 2026-11-09 12:30, refund R-1001, ticket T-2001";
    expect(maskSensitiveText(harmless)).toMatchObject({ text: harmless, sensitive: { iban: 0, phone: 0 } });
  });

  it("a card number is masked as a card, not as a phone number", () => {
    const masked = maskSensitiveText("card 4242 4242 4242 4242");
    expect(masked.text).toBe("card [card number removed]");
    expect(masked.sensitive).toEqual({ iban: 0, phone: 0 });
  });

  it("normalizeInput reports what it masked so the turn flow can show the form", () => {
    const result = normalizeInput(`Refund to ${IBAN}, call ${PHONE}`);
    expect(result.sensitive).toEqual({ iban: 1, phone: 1 });
    expect(result.text).not.toMatch(/PL61|600 100/);
    expect(result.stripped).toEqual(["1 bank account number(s) masked", "1 phone number(s) masked"]);
  });

  it("the output leak check blocks an answer that contains an account or phone number", () => {
    const reasons = detectLeak({ answer: `Send it to ${IBAN} or ${PHONE}`, promptTexts: [], canary: "NOPE", foreignSecrets: [] });
    expect(reasons).toEqual(expect.arrayContaining(["contains a bank account number", "contains a phone number"]));
    expect(detectLeak({ answer: "Your refund of 380 PLN is on its way.", promptTexts: [], canary: "NOPE", foreignSecrets: [] })).toEqual([]);
  });
});

describe("an IBAN typed into the chat never reaches the model, the panel or the transcript", () => {
  const ctx: SupportContext = { customerId: "c-anna", customerName: "Anna Kowalska", language: "en", threadId: "thread-iban-typed-1" };

  it("masks it before the run, shows the secure form from code and adds a fixed notice", async () => {
    const events: AgentEvent[] = [];
    subscribeToThread(ctx.threadId, (e) => events.push(e));
    const outcome = await handleUserMessage(ctx, `Please refund order 1007 to ${IBAN}`);

    const seenByModel = JSON.stringify(model.run.mock.calls[0][0]);
    expect(seenByModel).toContain("[bank account number removed]");
    expect(seenByModel).not.toMatch(/PL61|1090 1014|109010140000/);
    expect(JSON.stringify([events, readEventLog()])).not.toMatch(/PL61|1090 1014|109010140000/);
    expect(events.some((e) => e.kind === "widget" && e.widget.type === "secure-form" && e.widget.field === "iban")).toBe(true);
    expect(outcome.reply).toContain("secure form");
  });

  it("does not show a second form when the model already called the form tool", async () => {
    const events: AgentEvent[] = [];
    subscribeToThread("thread-iban-typed-2", (e) => events.push(e));
    model.run.mockImplementation(async (_input: unknown, runCtx: SupportContext) => {
      const { emitAgentEvent } = await import("@/lib/runtime/event-bus");
      emitAgentEvent(runCtx.threadId, { kind: "tool_call", agent: "Orders & Refunds Agent", tool: "request_bank_account", args: {} });
      emitAgentEvent(runCtx.threadId, { kind: "widget", widget: { type: "secure-form", field: "iban", title: "t", hint: "h" } });
      return { reply: "Please use the form.", approvals: [] };
    });
    await handleUserMessage({ ...ctx, threadId: "thread-iban-typed-2" }, `IBAN ${IBAN}`);
    expect(events.filter((e) => e.kind === "widget")).toHaveLength(1);
  });

  it("a guest is told to verify first, and no form is shown", async () => {
    const events: AgentEvent[] = [];
    subscribeToThread("thread-iban-guest", (e) => events.push(e));
    const outcome = await handleUserMessage({ customerId: "guest", customerName: "Guest", threadId: "thread-iban-guest" }, `My IBAN is ${IBAN}`);
    expect(events.some((e) => e.kind === "widget")).toBe(false);
    expect(outcome.reply).toContain("verify your identity");
  });
});

describe("secure form route", () => {
  const post = (threadId: string, cookie: string | undefined, body: unknown) =>
    secureFormRoute(
      new Request("http://demo.local/secure-form", { method: "POST", headers: cookie ? { cookie } : {}, body: JSON.stringify(body) }),
      { params: Promise.resolve({ threadId }) },
    );
  async function open(customerId: string) {
    const response = await createThreadRoute(new Request("http://demo.local/api/threads", { method: "POST", body: JSON.stringify({ customerId }) }));
    const { threadId } = (await response.json()) as { threadId: string };
    const value = credentialSetCookie(threadId, false).split(";")[0].split("=").slice(1).join("=");
    return { threadId, cookie: `${credentialCookieName(threadId)}=${value}` };
  }

  it("stores a valid IBAN server-side and answers with a status and the last four characters only", async () => {
    const { threadId, cookie } = await open("c-anna");
    const response = await post(threadId, cookie, { field: "iban", value: IBAN });
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(JSON.parse(text).status).toBe("IBAN_PROVIDED (last 4: 2874)");
    expect(text).not.toContain("1090");
    expect(getSecret(threadId, "iban")).toBe(IBAN);
    const stored = readEventLog().filter((l) => l.event.kind === "sensitive_stored");
    expect(stored).toHaveLength(1);
    const serializedLog = JSON.stringify(readEventLog());
    expect(serializedLog).not.toContain(IBAN);
    expect(serializedLog).not.toContain(IBAN_COMPACT);
    // UUIDs can contain digit groups by chance; only displayed statuses expose account data.
    for (const entry of stored) {
      if (entry.event.kind !== "sensitive_stored") continue;
      for (const group of ["PL61", "1090", "1014", "0000", "0712", "1981"]) {
        expect(entry.event.status).not.toContain(group);
      }
    }
  });

  it("refuses a wrong checksum and a bad phone with a message that does not echo the value", async () => {
    const { threadId, cookie } = await open("c-anna");
    const badIban = await post(threadId, cookie, { field: "iban", value: "PL61 1090 1014 0000 0712 1981 2875" });
    expect(badIban.status).toBe(422);
    expect(JSON.stringify(await badIban.json())).not.toContain("2875");
    expect((await post(threadId, cookie, { field: "phone", value: "12345" })).status).toBe(422);
    expect(getSecret(threadId, "iban")).toBeUndefined();
  });

  it("refuses without the thread credential, and for a guest", async () => {
    const { threadId, cookie } = await open("c-anna");
    expect((await post(threadId, undefined, { field: "iban", value: IBAN })).status).toBe(403);
    expect(getSecret(threadId, "iban")).toBeUndefined();
    const guest = await open("guest");
    const refused = await post(guest.threadId, guest.cookie, { field: "iban", value: IBAN });
    expect(refused.status).toBe(403);
    expect(await refused.json()).toMatchObject({ errorType: "NotVerified" });
    expect(cookie).toBeTruthy();
  });

  it("limits how many values one conversation may submit", () => {
    for (let i = 0; i < MAX_SUBMISSIONS_PER_THREAD; i++) expect(storeSecret("t-limit", "phone", PHONE).ok).toBe(true);
    expect(storeSecret("t-limit", "phone", PHONE)).toMatchObject({ ok: false, errorType: "TooManySubmissions" });
  });
});

describe("refund of a cash-on-delivery order", () => {
  const ctx: SupportContext = { customerId: "c-anna", customerName: "Anna Kowalska", language: "pl", threadId: "thread-cod-refund" };
  const refundArgs = JSON.stringify({ orderId: "1007", amount: 380, reason: "armchair does not fit" });

  it("the rule: a cash-on-delivery order needs a valid IBAN on file, a card order does not", () => {
    const cod = findOrderForCustomer("c-anna", "1007");
    expect(checkPayout(cod, ctx.threadId)).toMatchObject({ ok: false, code: "BANK_ACCOUNT_REQUIRED" });
    storeSecret(ctx.threadId, "iban", IBAN);
    expect(checkPayout(cod, ctx.threadId)).toEqual({ ok: true });
    expect(checkPayout(findOrderForCustomer("c-anna", "1001"), "thread-without-iban")).toEqual({ ok: true });
  });

  it("create_refund is refused without the IBAN, then succeeds and tells the model only a status", async () => {
    const refused = await createRefund.invoke(new RunContext(ctx), refundArgs);
    expect(refused).toContain("BANK_ACCOUNT_REQUIRED");
    expect(listRefunds()).toHaveLength(0);

    storeSecret(ctx.threadId, "iban", IBAN);
    const created = await createRefund.invoke(new RunContext(ctx), refundArgs);
    expect(created).toContain("REFUND_CREATED");
    expect(created).toContain("IBAN_PROVIDED (last 4: 2874)");
    expect(created).not.toMatch(/PL61|1090/);
    expect(listRefunds()[0].payout).toBe("IBAN_PROVIDED (last 4: 2874)");
  });

  it("request_bank_account shows the form once; with the IBAN on file it only reports the status", async () => {
    const events: AgentEvent[] = [];
    subscribeToThread(ctx.threadId, (e) => events.push(e));
    const first = await requestBankAccount.invoke(new RunContext(ctx), "{}");
    expect(first).toContain("FORM_SHOWN");
    expect(events.filter((e) => e.kind === "widget")).toHaveLength(1);

    storeSecret(ctx.threadId, "iban", IBAN);
    const second = await requestBankAccount.invoke(new RunContext(ctx), "{}");
    expect(second).toContain("IBAN_PROVIDED (last 4: 2874)");
    expect(second).not.toContain("1090");
    expect(events.filter((e) => e.kind === "widget")).toHaveLength(1);
  });
});
