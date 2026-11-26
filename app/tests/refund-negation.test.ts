/** The refund wish reader: negation must govern the refund word, not merely sit near it. */
import { expect, it } from "vitest";
import { refundWish } from "@/lib/runtime/refund-negation";

const withdrawn = [
  "What is the status of my order 1006? Do not change or refund anything.",
  "Jaki jest status zamówienia 1006? Nie rób zwrotu.",
  "Nie chcę zwrotu, tylko status.",
  "Zwrot nie jest potrzebny.",
  "Bez zwrotu proszę.",
  "Ich brauche keine Erstattung.",
  "Order 1006 status please, no refund needed.",
  "The refund is not needed.",
  "Refund not required.",
  "I don't want a refund.",
  "Please don’t refund it.",
  "She doesn’t want a refund",
  "Actually, never mind, do not refund it.",
  "No, I do not want a refund.",
];
const asked = [
  "Refund order 1001 for 249 PLN.",
  "I did not receive the lamp can you refund order 1001",
  "Please do not delay my refund",
  "Can you not refund the shipping but refund the lamp?",
  "Ich möchte keinen Umtausch sondern Erstattung",
  "Nie dostałem lampy, proszę o zwrot",
  "Proszę o zwrot zamówienia 1001.",
];

it.each(withdrawn)("withdraws: %s", (text) => expect(refundWish(text)).toBe("withdrawn"));
it.each(asked)("asks: %s", (text) => expect(refundWish(text)).toBe("asked"));
it("ignores messages without a refund word", () => expect(refundWish("Where is my order 1004?")).toBeUndefined());
