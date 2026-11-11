import { describe, expect, it } from "vitest";
import { decideEscalation, GUARDRAIL_TRIP_LIMIT, TOOL_ERROR_LIMIT } from "@/lib/escalation/rules";

const quiet = { guardrailTrips: 0, toolErrors: 0 };
const decide = (text: string) => decideEscalation({ text, ...quiet });

describe("decideEscalation: explicit request for a human (PL / EN / DE)", () => {
  it.each([
    "I want to talk to a human",
    "Let me speak to a consultant please",
    "Chcę rozmawiać z człowiekiem",
    "Poproszę konsultanta",
    "Ich möchte mit einem Mitarbeiter sprechen",
    "Ist da ein Mensch?",
    "I said I want a human!",
    "Put me through to a real person",
    "Mit einem Menschen bitte",
    "Chcę rozmawiać z prawdziwym człowiekiem",
    "Proszę o kontakt z konsultantem",
  ])("escalates: %s", (text) => {
    const decision = decide(text);
    expect(decision.escalate && decision.reason).toBe("human_requested");
  });
});

describe("decideEscalation: legal and GDPR terms (PL / EN / DE)", () => {
  it.each([
    "I will sue you",
    "my lawyer will call you",
    "Please delete my data",
    "this violates GDPR",
    "Złożę pozew",
    "Skontaktuję się z prawnikiem",
    "To narusza RODO",
    "Usuń moje dane osobowe",
    "Ich rufe meinen Anwalt an",
    "Das verstößt gegen den Datenschutz",
  ])("escalates: %s", (text) => {
    const decision = decide(text);
    expect(decision.escalate && decision.reason).toBe("legal_or_gdpr");
  });

  it("a legal threat outranks a request for a human (it needs a record AND a person)", () => {
    const decision = decide("I want a human, otherwise I will sue you");
    expect(decision.escalate && decision.reason).toBe("legal_or_gdpr");
  });
});

describe("decideEscalation: counters", () => {
  it("escalates on the second guardrail trip, not on the first", () => {
    expect(decideEscalation({ text: "", guardrailTrips: GUARDRAIL_TRIP_LIMIT - 1, toolErrors: 0 }).escalate).toBe(false);
    const decision = decideEscalation({ text: "", guardrailTrips: GUARDRAIL_TRIP_LIMIT, toolErrors: 0 });
    expect(decision.escalate && decision.reason).toBe("guardrail_trips");
  });

  it("escalates on the second tool error, not on the first", () => {
    expect(decideEscalation({ text: "", guardrailTrips: 0, toolErrors: TOOL_ERROR_LIMIT - 1 }).escalate).toBe(false);
    const decision = decideEscalation({ text: "", guardrailTrips: 0, toolErrors: TOOL_ERROR_LIMIT });
    expect(decision.escalate && decision.reason).toBe("tool_errors");
  });
});

describe("decideEscalation: ordinary messages do not escalate", () => {
  it.each([
    "Where is my order 1004?",
    "Czy dostarczacie do Niemiec?",
    "Wie lange habe ich Zeit für eine Rückgabe?",
    "The chair is humane and well made",
    "The wrong date was a human error on your side",
    "That is a human mistake, no problem",
    "Is the human resources team involved in my delivery?",
    "Many people bought this sofa, is it popular?",
    "Viele Menschen kaufen dieses Sofa",
    "To był błąd ludzki, ale dziękuję",
    "I pursued this earlier",
    "",
  ])("stays with the agent: %j", (text) => {
    expect(decide(text)).toEqual({ escalate: false });
  });
});
