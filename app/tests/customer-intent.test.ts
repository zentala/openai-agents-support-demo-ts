/** Pure customer hand-back phrases; the wording routes before any model turn begins. */
import { expect, it } from "vitest";
import { wantsAssistant } from "@/lib/runtime/customer-intent";

it.each(["Back to the assistant, please.", "I don't want to talk to this consultant.", "Wróć do asystenta.", "Nie chcę rozmawiać z tym konsultantem.", "Zurück zum Assistenten.", "Ich möchte nicht mit diesem Mitarbeiter sprechen."]) ("recognizes: %s", (text) => {
  expect(wantsAssistant(text)).toBe(true);
});

it.each(["Can I speak to a person?", "I need help with my order.", "Der Mitarbeiter hat mir geholfen."]) ("does not hand back ordinary messages: %s", (text) => {
  expect(wantsAssistant(text)).toBe(false);
});
