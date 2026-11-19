/** The proxy can refuse before JSON parsing, so a plain-text 401 must reach the password notice. */
import { expect, it } from "vitest";
import { adminActionResponse, adminResponse } from "@/lib/client/admin-response";
it("recognizes a plain-text password challenge", async () => {
  await expect(adminResponse(new Response("Authentication required", { status: 401 }))).rejects.toThrow("AdminPasswordRequired");
});
it("keeps the actionable tone acknowledgement on 409 while preserving other refusals", async () => {
  const body = { ok: false, errorType: "StaffToneWarning", warningId: "server-warning", message: "This may sound rude to the customer. Send anyway?" };
  await expect(adminActionResponse(Response.json(body, { status: 409 }))).resolves.toEqual(body);
  await expect(adminActionResponse(Response.json({ errorType: "NotYourConversation", message: "Owned by someone else" }, { status: 409 })))
    .rejects.toThrow("NotYourConversation: Owned by someone else");
  await expect(adminActionResponse(new Response("Authentication required", { status: 401 }))).rejects.toThrow("AdminPasswordRequired");
});
it("preserves specific JSON failures and successful bodies", async () => {
  await expect(adminResponse(Response.json({ message: "Already decided", errorType: "ApprovalGone" }, { status: 409 }))).rejects.toThrow("ApprovalGone: Already decided");
  await expect(adminResponse(Response.json({ ok: true }))).resolves.toEqual({ ok: true });
});
