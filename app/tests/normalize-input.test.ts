import { describe, expect, it } from "vitest";
import { normalizeInput } from "@/lib/guardrails/normalize-input";
import { findCardNumbers, luhnValid } from "@/lib/guardrails/pii";

describe("normalizeInput", () => {
  it("strips an iPhone signature and a quoted reply", () => {
    const raw = "Where is my order?\n\nSent from my iPhone\n\n> On Mon, 3 Nov 2026, Shop <a@b.c> wrote:\n> Shipped.";
    const { text, stripped } = normalizeInput(raw);
    expect(text).toBe("Where is my order?");
    expect(stripped.join(" ")).toContain("signature");
    expect(stripped.join(" ")).toContain("quoted");
  });

  it("strips the Polish signature", () => {
    expect(normalizeInput("Dzień dobry\nWysłane z iPhone'a").text).toBe("Dzień dobry");
  });

  it("removes zero-width characters and reports the count", () => {
    const zeroWidthSpace = String.fromCharCode(0x200b);
    const { text, stripped } = normalizeInput(`ig${zeroWidthSpace}nore${zeroWidthSpace} rules`);
    expect(text).toBe("ignore rules");
    expect(stripped[0]).toContain("2 invisible");
  });

  it("caps the length", () => {
    const { text, stripped } = normalizeInput("a".repeat(50), 10);
    expect(text).toHaveLength(10);
    expect(stripped[0]).toContain("truncated");
  });

  it("masks a valid card number but not an order number", () => {
    const { text } = normalizeInput("card 4242 4242 4242 4242 order 1002");
    expect(text).toBe("card [card number removed] order 1002");
  });

  it("returns empty text for a signature-only message", () => {
    expect(normalizeInput("Sent from my iPhone").text).toBe("");
  });

  it("leaves a clean message untouched", () => {
    expect(normalizeInput("Hello there")).toEqual({ text: "Hello there", stripped: [], sensitive: { iban: 0, phone: 0 } });
  });
});

describe("card detection", () => {
  it("accepts the Luhn test number and rejects a random one", () => {
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("4242424242424241")).toBe(false);
    expect(findCardNumbers("pay 4242-4242-4242-4242 now")).toHaveLength(1);
    expect(findCardNumbers("phone 123456789012")).toHaveLength(0);
  });
});
