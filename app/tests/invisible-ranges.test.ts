/** Regression: invisible formatting must not hide payment data from input masking or output checks. */
import { expect, it } from "vitest";
import { normalizeInput, stripInvisible, maskSensitiveText } from "@/lib/guardrails/normalize-input";
import { detectLeak } from "@/lib/guardrails/leak-detect";

const codepoints = [0x00ad, 0x034f, 0x061c, 0x180e, ...Array.from({ length: 16 }, (_, i) => 0xfe00 + i)];
it.each(codepoints)("removes U+%i before masking and checking output", (point) => {
  const hidden = [..."PL61109010140000071219812874"].join(String.fromCodePoint(point));
  expect(normalizeInput(hidden).text).toBe("[bank account number removed]");
  expect(maskSensitiveText(stripInvisible(hidden)).text).toBe("[bank account number removed]");
  expect(detectLeak({ answer: hidden, promptTexts: [], canary: "never-match", foreignSecrets: [] }))
    .toContain("contains a bank account number");
});
