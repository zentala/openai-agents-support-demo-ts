/** The proxy can refuse before JSON parsing, so a plain-text 401 must reach the password notice. */
import { expect, it } from "vitest";
import { adminResponse } from "@/lib/client/admin-response";
it("recognizes a plain-text password challenge", async () => {
  await expect(adminResponse(new Response("Authentication required", { status: 401 }))).rejects.toThrow("AdminPasswordRequired");
});
it("preserves specific JSON failures and successful bodies", async () => {
  await expect(adminResponse(Response.json({ message: "Already decided", errorType: "ApprovalGone" }, { status: 409 }))).rejects.toThrow("ApprovalGone: Already decided");
  await expect(adminResponse(Response.json({ ok: true }))).resolves.toEqual({ ok: true });
});
