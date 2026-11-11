/** Redaction recognizes credential shapes without damaging ordinary furniture/support vocabulary. */
import { expect, it } from "vitest";
import { redactSecrets, withRequestKey } from "@/lib/security/request-key";

it.each(["", "proj-", "svcacct-", "admin-"])("redacts long key bodies with prefix %s", (prefix) => {
  const marker = "sk-" + prefix + "synthetic".repeat(4);
  expect(redactSecrets(`Before ${marker}, after`)).toBe("Before sk-***, after");
});

it("preserves words containing a key-like substring and short fragments", () => {
  const words = "desk-lamp risk-free task-chair sk-short";
  expect(redactSecrets(words)).toBe(words);
  expect(redactSecrets("desk-" + "a".repeat(30))).toBe("desk-" + "a".repeat(30));
});

it("still removes the exact request header even when it is malformed or short", () => {
  const marker = "not-a-valid-credential";
  const req = new Request("https://demo.example", { headers: { "x-openai-key": marker } });
  expect(withRequestKey(req, () => redactSecrets(marker))).toBe("[key removed]");
});
