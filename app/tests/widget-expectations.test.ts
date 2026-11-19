/** Eval regressions: Yes/No offers cannot stand in for a form, and a valid escalation offer is not an address proposal. */
import { expect, it } from "vitest";
import { evaluate } from "@/lib/eval/checks";
import { expectSchema, scenarios } from "@/lib/eval/scenarios";
import type { AgentEvent, ChatWidget } from "@/lib/types";

const quick: ChatWidget = { type: "quick-replies", offerId: "offer", threadId: "thread", prompt: "Would you like a person?", yes: "Yes", no: "No" };
const forms: ChatWidget[] = [
  { type: "order-picker", prompt: "Choose", orders: [] },
  { type: "secure-form", field: "iban", title: "Bank account", hint: "Use the form" },
  { type: "photo-upload", prompt: "Optional photo", maxBytes: 1000, acceptedTypes: ["image/png"] },
  { type: "address-confirm", proposalId: "proposal", orderId: "1004", prompt: "Confirm", oldAddress: { street: "Old", city: "London", postalCode: "SW1A 1AA" }, newAddress: { street: "New", city: "London", postalCode: "SW1A 2AA" } },
];
const observed = (...widgets: ChatWidget[]) => ({ reply: "", events: widgets.map((widget, i): AgentEvent => ({ id: `widget-${i}`, ts: i, kind: "widget", widget })) });

it.each(forms)("requires the exact $type kind even when quick replies are present", (form) => {
  const expectation = expectSchema.parse({ widgetsShown: [form.type] });
  expect(evaluate(expectation, observed(quick))).toEqual([`widget ${form.type} was not shown`]);
  expect(evaluate(expectation, observed(quick, form))).toEqual([]);
  expect(evaluate(expectation, observed())).toHaveLength(1);
});

it("an address refusal allows a real escalation offer but rejects any address card", () => {
  const expectation = expectSchema.parse({ widgetsNotShown: ["address-confirm"], addressStatus: "none" });
  expect(evaluate(expectation, observed(quick))).toEqual([]);
  expect(evaluate(expectation, observed())).toEqual([]);
  expect(evaluate(expectation, observed(quick, forms[3]))).toEqual(["widget address-confirm must not be shown"]);
});

it("typed presence is not satisfied by another kind of form", () => {
  expect(evaluate({ widgetsShown: ["order-picker"] }, observed(forms[1]))).toEqual(["widget order-picker was not shown"]);
  expect(evaluate({ widgetsShown: ["secure-form", "address-confirm"] }, observed(forms[1]))).toEqual(["widget address-confirm was not shown"]);
});

it("quick replies keep their separate explicit assertion", () => {
  expect(evaluate({ quickRepliesShown: true }, observed(forms[0]))).toEqual(["quickRepliesShown should be true"]);
  expect(evaluate({ quickRepliesShown: true, widgetsShown: ["order-picker"] }, observed(quick, forms[0]))).toEqual([]);
  expect(evaluate({ quickRepliesShown: false }, observed(quick))).toEqual(["quickRepliesShown should be false"]);
});

it("the expectation schema rejects unknown fields, widget kinds and quick replies in form assertions", () => {
  for (const invalid of [{ widgetsShwon: ["order-picker"] }, { widgetsShown: ["invented"] }, { widgetsNotShown: ["quick-replies"] }]) {
    expect(expectSchema.safeParse(invalid).success).toBe(false);
  }
  expect(expectSchema.safeParse({ widgetsShown: ["secure-form"], widgetsNotShown: ["address-confirm"], quickRepliesShown: true }).success).toBe(true);
});

it("all 49 fixtures remain parsed, and the seven widget stories use exact business kinds", () => {
  expect(scenarios).toHaveLength(49);
  const kinds = { "order-picker": "order-picker", "iban-typed-in-chat": "secure-form", "cod-refund-needs-iban": "secure-form", "address-change-confirm": "address-confirm" };
  for (const [id, kind] of Object.entries(kinds)) {
    const expectation = scenarios.find((scenario) => scenario.id === id)!.expect;
    expect(expectation.widgetsShown).toEqual([kind]);
    expect(expectation.widgetShown).toBeUndefined();
  }
  for (const id of ["address-delivered-refused", "address-country-postcode-refused", "address-country-change-refused"]) {
    const expectation = scenarios.find((scenario) => scenario.id === id)!.expect;
    expect(expectation).toMatchObject({ widgetsNotShown: ["address-confirm"], addressStatus: "none" });
    expect(expectation.widgetShown).toBeUndefined();
  }
});

it.each(["get_order", "list_my_orders"])("the address story accepts %s while retaining its address and no-picker checks", (tool) => {
  const expectation = scenarios.find((scenario) => scenario.id === "order-delivery-address")!.expect;
  const events: AgentEvent[] = [{ id: "read", ts: 0, kind: "tool_call", agent: "Orders", tool, args: { orderId: "1004" } }];
  expect(evaluate(expectation, { reply: "14 Baker Lane, London, SW1A 1AA", events })).toEqual([]);
  expect(evaluate(expectation, { reply: "An address", events })).not.toEqual([]);
  expect(evaluate(expectation, { reply: "14 Baker Lane, London, SW1A 1AA", events: [...events, { ...events[0], tool: "show_order_picker" } as AgentEvent] })).toContain("tool show_order_picker must not be called");
});
