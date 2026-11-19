import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addPhoto, listClaims, resetDemoData } from "@/lib/data/store";
import { mergeClaimFields, type ClaimFields } from "@/lib/claims/claim-draft";
import { CLAIM_SLOTS, claimSchema } from "@/lib/claims/claim-schema";
import { checkPhoto, detectPhotoType, MAX_PHOTO_BYTES } from "@/lib/claims/photo-validate";
import { clearEventLog, subscribeToThread } from "@/lib/runtime/event-bus";
import { pickMutable } from "@/lib/runtime/context-diff";
import type { RunOutcome } from "@/lib/runtime/run-support";
import { getThread } from "@/lib/runtime/threads";
import { credentialCookieName, credentialSetCookie } from "@/lib/security/thread-credential";
import { nextSlot, slotViews } from "@/lib/slots/slots";
import { requestClaimPhoto, submitClaim, updateClaim } from "@/lib/tools/claim";
import type { AgentEvent, SupportContext } from "@/lib/types";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");
const { POST: createThreadRoute } = await import("@/app/api/threads/route");
const { POST: photoRoute } = await import("@/app/api/threads/[threadId]/photo/route");

const TODAY = "2026-11-09";
const none: ClaimFields = { orderId: null, item: null, damage: null, noticedAt: null };
const lena: SupportContext = { customerId: "c-lena", customerName: "Lena Schmidt", language: "de", threadId: "thread-claim-tools" };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const isoToday = () => new Date().toISOString().slice(0, 10);

beforeEach(() => {
  resetDemoData();
  clearEventLog();
  model.run.mockReset();
});

describe("slot helpers", () => {
  it("asks for the first missing required slot only, and shows filled/missing for the panel", () => {
    const draft = { orderId: "2002", item: "Wardrobe" };
    expect(nextSlot(CLAIM_SLOTS, draft)?.key).toBe("damage");
    expect(nextSlot(CLAIM_SLOTS, { ...draft, damage: "x".repeat(12), noticedAt: TODAY })).toBeUndefined();
    const views = slotViews(CLAIM_SLOTS, { ...draft, photoId: "PH-1" }, ["photoId"]);
    expect(views.filter((v) => v.filled).map((v) => v.key)).toEqual(["orderId", "item", "photoId"]);
    expect(views.find((v) => v.key === "photoId")).toMatchObject({ required: false, value: "attached" });
  });
});

describe("mergeClaimFields: every field is validated in code", () => {
  const merge = (customerId: string, incoming: Partial<ClaimFields>, draft = {}) => mergeClaimFields(customerId, draft, { ...none, ...incoming }, TODAY);

  it("accepts a delivered order inside the window and fills the item when the order has only one", () => {
    const { draft, rejected } = merge("c-lena", { orderId: "#2002" });
    expect(rejected).toEqual([]);
    expect(draft).toEqual({ orderId: "2002", item: "Aalborg 3-door wardrobe" });
  });

  it("refuses someone else's order exactly like a missing one, an expired window and an undelivered order", () => {
    expect(merge("c-lena", { orderId: "1004" }).rejected[0]).toMatchObject({ field: "orderId", code: "ORDER_NOT_FOUND" });
    expect(merge("c-lena", { orderId: "2001" }).rejected[0]).toMatchObject({ code: "CLAIM_WINDOW_EXPIRED" });
    expect(merge("c-james", { orderId: "1004" }).rejected[0]).toMatchObject({ code: "NOT_DELIVERED" });
  });

  it("refuses an item that is not in the order and names the real items", () => {
    const { rejected } = merge("c-lena", { item: "Sofa" }, { orderId: "2002" });
    expect(rejected[0]).toMatchObject({ field: "item", code: "ITEM_NOT_IN_ORDER" });
    expect(rejected[0].message).toContain("Aalborg 3-door wardrobe");
  });

  it("refuses a short damage text, a malformed date, a future date and a date before delivery", () => {
    const base = { orderId: "2002" };
    expect(merge("c-lena", { damage: "broken" }, base).rejected[0].code).toBe("DAMAGE_TOO_SHORT");
    expect(merge("c-lena", { noticedAt: "yesterday" }, base).rejected[0].code).toBe("INVALID_DATE");
    expect(merge("c-lena", { noticedAt: "2026-11-10" }, base).rejected[0].code).toBe("DATE_IN_FUTURE");
    expect(merge("c-lena", { noticedAt: "2026-11-01" }, base).rejected[0].code).toBe("BEFORE_DELIVERY"); // delivered 5 days before 2026-11-09
    expect(merge("c-lena", { noticedAt: "2026-11-07" }, base).rejected).toEqual([]);
  });
});

describe("claim tools: one question at a time, claim only from a valid draft", () => {
  const call = async (tool: typeof updateClaim | typeof submitClaim | typeof requestClaimPhoto, session: SupportContext, args = {}) =>
    tool.invoke(new RunContext(session), JSON.stringify(tool === updateClaim ? { ...none, ...args } : args));

  it("update_claim answers with exactly the next question and keeps the draft in the run context", async () => {
    const session = { ...lena, threadId: "thread-claim-q" };
    const first = await call(updateClaim, session, { orderId: "2002" });
    expect(first).toContain("IN_PROGRESS");
    expect(first).toContain("What exactly is damaged?");
    expect(first).not.toContain("On which date");
    expect(session.claimDraft).toMatchObject({ orderId: "2002" });

    const second = await call(updateClaim, session, { damage: "The left door is cracked along the edge." });
    expect(second).toContain("On which date did you notice");
    expect(session.claimDraft?.damage).toContain("cracked");
  });

  it("submit_claim refuses an incomplete draft and creates nothing", async () => {
    const session = { ...lena, threadId: "thread-claim-inc", claimDraft: { orderId: "2002", item: "Aalborg 3-door wardrobe" } };
    const result = await call(submitClaim, session);
    expect(result).toContain("INCOMPLETE");
    expect(result).toContain("damage");
    expect(listClaims()).toHaveLength(0);
  });

  it("submit_claim creates the claim from a complete draft, clears the draft and tells the panel", async () => {
    const events: AgentEvent[] = [];
    const session: SupportContext = {
      ...lena,
      threadId: "thread-claim-ok",
      claimDraft: { orderId: "2002", item: "Aalborg 3-door wardrobe", damage: "The left door is cracked along the edge.", noticedAt: isoToday() },
    };
    subscribeToThread(session.threadId, (e) => events.push(e));
    const result = await call(submitClaim, session);
    expect(result).toContain("CLAIM_CREATED");
    expect(listClaims()).toMatchObject([{ customerId: "c-lena", orderId: "2002", noticedAt: isoToday() }]);
    expect(session.claimDraft).toBeUndefined();
    expect(events.at(-1)).toMatchObject({ kind: "slots", form: "damage-claim", outcome: expect.stringContaining("created") });
  });

  it("submit_claim does not accept a photo id uploaded by another conversation", async () => {
    const foreign = addPhoto({ threadId: "someone-else", mimeType: "image/png", bytes: Buffer.from(PNG), fileName: "x.png" });
    if (!foreign) throw new Error("Photo fixture could not be stored");
    const session: SupportContext = {
      ...lena,
      threadId: "thread-claim-photo",
      claimDraft: { orderId: "2002", item: "Aalborg 3-door wardrobe", damage: "The left door is cracked along the edge.", noticedAt: isoToday(), photoId: foreign.id },
    };
    expect(await call(submitClaim, session)).toContain("PHOTO_NOT_FOUND");
    expect(listClaims()).toHaveLength(0);
  });

  it("the full schema is the gate: a draft with a 3-letter damage text does not parse", () => {
    expect(claimSchema.safeParse({ orderId: "2002", item: "Wardrobe", damage: "bad", noticedAt: TODAY }).success).toBe(false);
  });

  it("request_claim_photo needs an order first, then shows the upload card", async () => {
    const events: AgentEvent[] = [];
    const session = { ...lena, threadId: "thread-claim-card" };
    subscribeToThread(session.threadId, (e) => events.push(e));
    expect(await call(requestClaimPhoto, session)).toContain("NO_CLAIM_ORDER");
    session.claimDraft = { orderId: "2002" };
    expect(await call(requestClaimPhoto, session)).toContain("UPLOAD_CARD_SHOWN");
    expect(events.find((e) => e.kind === "widget")).toMatchObject({ widget: { type: "photo-upload", maxBytes: MAX_PHOTO_BYTES } });
  });
});

describe("the draft survives between turns (kept on the server with the thread)", () => {
  it("a draft written during turn 1 is in the run context of turn 2", async () => {
    const ctx: SupportContext = { ...lena, threadId: "thread-claim-memory" };
    model.run.mockImplementationOnce(async (_input: unknown, runCtx: SupportContext) => {
      runCtx.claimDraft = { orderId: "2002", item: "Aalborg 3-door wardrobe" };
      return { reply: "What is damaged?", approvals: [], context: pickMutable(runCtx) } satisfies RunOutcome;
    });
    model.run.mockImplementationOnce(async () => ({ reply: "ok", approvals: [] }) satisfies RunOutcome);
    await handleUserMessage(ctx, "my wardrobe is damaged");
    await handleUserMessage(ctx, "the door is cracked");
    expect(model.run.mock.calls[1][1].claimDraft).toEqual({ orderId: "2002", item: "Aalborg 3-door wardrobe" });
  });
});

describe("photo validation", () => {
  it("detects the real format from the first bytes", () => {
    expect(detectPhotoType(PNG)).toBe("image/png");
    expect(detectPhotoType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectPhotoType(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("image/webp");
    expect(detectPhotoType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeUndefined();
  });

  it("refuses empty, oversize, wrong declared type and a text file that only claims to be a PNG", () => {
    expect(checkPhoto(new Uint8Array(0), "image/png")).toMatchObject({ ok: false, errorType: "EmptyFile" });
    expect(checkPhoto(new Uint8Array(MAX_PHOTO_BYTES + 1), "image/png")).toMatchObject({ ok: false, errorType: "FileTooLarge" });
    expect(checkPhoto(PNG, "application/pdf")).toMatchObject({ ok: false, errorType: "UnsupportedType" });
    expect(checkPhoto(new TextEncoder().encode("not an image"), "image/png")).toMatchObject({ ok: false, errorType: "NotAnImage" });
    expect(checkPhoto(PNG, "image/png")).toEqual({ ok: true, type: "image/png" });
  });
});

describe("photo upload route", () => {
  async function openThread(customerId: string, claimDraft?: object) {
    const response = await createThreadRoute(new Request("http://demo.local/api/threads", { method: "POST", body: JSON.stringify({ customerId }) }));
    const { threadId } = (await response.json()) as { threadId: string };
    if (claimDraft) getThread(threadId)!.memory.claimDraft = claimDraft;
    const value = credentialSetCookie(threadId, false).split(";")[0].split("=").slice(1).join("=");
    return { threadId, cookie: `${credentialCookieName(threadId)}=${value}` };
  }

  /** Builds a real multipart request, with the Content-Length a browser would announce. */
  async function upload(threadId: string, cookie: string | undefined, bytes: Uint8Array, type: string, announce?: number) {
    const form = new FormData();
    form.append("photo", new File([bytes as BlobPart], "damage.png", { type }));
    const probe = new Request("http://demo.local/photo", { method: "POST", body: form });
    const body = new Uint8Array(await probe.arrayBuffer());
    return photoRoute(
      new Request("http://demo.local/photo", {
        method: "POST",
        headers: { ...(cookie ? { cookie } : {}), "content-type": probe.headers.get("content-type")!, "content-length": String(announce ?? body.byteLength) },
        body,
      }),
      { params: Promise.resolve({ threadId }) },
    );
  }

  it("stores a valid image, ties it to the thread and writes its id into the claim draft", async () => {
    const { threadId, cookie } = await openThread("c-lena", { orderId: "2002" });
    const response = await upload(threadId, cookie, PNG, "image/png");
    const { photoId } = (await response.json()) as { photoId: string };
    expect(response.status).toBe(200);
    expect(getThread(threadId)?.memory.claimDraft).toEqual({ orderId: "2002", photoId });
  });

  it("refuses: no credential, a guest, no claim in progress, an announced oversize body, a fake image", async () => {
    const lenaThread = await openThread("c-lena", { orderId: "2002" });
    expect((await upload(lenaThread.threadId, undefined, PNG, "image/png")).status).toBe(403);
    const guest = await openThread("guest");
    expect((await upload(guest.threadId, guest.cookie, PNG, "image/png")).status).toBe(403);
    const noClaim = await openThread("c-lena");
    expect((await upload(noClaim.threadId, noClaim.cookie, PNG, "image/png")).status).toBe(409);
    expect((await upload(lenaThread.threadId, lenaThread.cookie, PNG, "image/png", MAX_PHOTO_BYTES * 2)).status).toBe(413);
    const fake = await upload(lenaThread.threadId, lenaThread.cookie, new TextEncoder().encode("MZ not an image"), "image/png");
    expect(fake.status).toBe(422);
    expect(getThread(lenaThread.threadId)?.memory.claimDraft?.photoId).toBeUndefined();
  });
});
