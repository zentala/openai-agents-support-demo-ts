/** Real claim/address tool regressions: declined photos cannot block completion; collection retries cannot erase cards. */
import { RunContext } from "@openai/agents";
import { beforeEach, expect, it } from "vitest";
import { createThread } from "@/lib/runtime/threads";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { clearEventLog, readEventLog } from "@/lib/runtime/event-bus";
import { currentAddress, findOrderForCustomer, listClaims, resetDemoData } from "@/lib/data/store";
import { requestClaimPhoto, submitClaim, updateClaim } from "@/lib/tools/claim";
import { updateAddressChange } from "@/lib/tools/address";
import { decideAddressChange } from "@/lib/address/address-flow";
beforeEach(() => { resetDemoData(); clearEventLog(); });

it("continues a complete confirmed claim after declining an optional photo, with exactly one claim", async () => {
  const thread = createThread("c-lena");
  const ctx = new RunContext({ ...sessionContextOf(thread), customerMessage: "No photo, thanks. Yes, that summary is correct, please file the claim." });
  await updateClaim.invoke(ctx, JSON.stringify({ orderId: "2002", item: null, damage: "The left door has a deep crack along the whole edge.", noticedAt: new Date().toISOString().slice(0, 10) }));
  expect(ctx.context.claimDraft?.item).toBe("Aalborg 3-door wardrobe");
  expect(await requestClaimPhoto.invoke(ctx, "{}")).toContain("PHOTO_DECLINED");
  expect(readEventLog().some(({ event }) => event.kind === "widget" && event.widget.type === "photo-upload")).toBe(false);
  expect(await submitClaim.invoke(ctx, "{}")).toContain("CLAIM_CREATED");
  expect(listClaims()).toHaveLength(1);
  expect(await submitClaim.invoke(ctx, "{}")).toContain("INCOMPLETE");
  expect(listClaims()).toHaveLength(1);
});

it("offers an optional photo once per claim instead of repeating the stop instruction", async () => {
  const thread = createThread("c-lena");
  const ctx = new RunContext({ ...sessionContextOf(thread), claimDraft: { orderId: "2002" } });
  expect(await requestClaimPhoto.invoke(ctx, "{}")).toContain("UPLOAD_CARD_SHOWN");
  expect(await requestClaimPhoto.invoke(ctx, "{}")).toContain("PHOTO_ALREADY_OFFERED");
  expect(readEventLog().filter(({ event }) => event.kind === "widget")).toHaveLength(1);
});

it("retains the same valid address proposal through redundant and partial tool calls; only Confirm applies it", async () => {
  const thread = createThread("c-james");
  const ctx = new RunContext(sessionContextOf(thread));
  const empty = { orderId: null, street: null, city: null, postalCode: null, country: null };
  await updateAddressChange.invoke(ctx, JSON.stringify({ ...empty, orderId: "1004", street: "22 Elm Street", city: "Manchester", postalCode: "M1 4BT" }));
  const proposal = thread.pendingAddress!;
  expect(proposal).toBeDefined();
  expect(await updateAddressChange.invoke(ctx, JSON.stringify(empty))).toContain("CONFIRMATION_SHOWN");
  expect(await updateAddressChange.invoke(ctx, JSON.stringify({ ...empty, postalCode: "M1 4BT" }))).toContain("CONFIRMATION_SHOWN");
  expect(thread.pendingAddress?.proposalId).toBe(proposal.proposalId);
  expect(currentAddress(findOrderForCustomer("c-james", "1004")!).street).toBe("14 Baker Lane");
  expect(decideAddressChange(thread, "en", { type: "address", orderId: "1004", proposalId: proposal.proposalId, decision: "confirm" })).toContain("22 Elm Street");
});
