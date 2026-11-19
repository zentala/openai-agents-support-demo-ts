/** Singular and plural queue headings. */
import { expect, it } from "vitest";
import { humanQueueLabel } from "@/lib/client/human-queue-label";
it.each([[0, "0 need a human"], [1, "1 needs a human"], [2, "2 need a human"]])("labels count %i", (count, expected) => {
  expect(humanQueueLabel(Number(count))).toBe(expected);
});
