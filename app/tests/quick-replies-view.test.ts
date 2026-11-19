/** Quick reply controls require structured data, latest-message state and matching thread; rendering sends nothing. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { QuickReplies } from "@/components/quick-replies";
import { MessageList } from "@/components/message-list";
import { toChatMessage } from "@/lib/client/pushed-messages";
import type { QuickReplyWidget, SupportUIMessage } from "@/lib/types";
import { evaluate } from "@/lib/eval/checks";

const widget: QuickReplyWidget = { type: "quick-replies", offerId: "offer", threadId: "thread-a", prompt: "Would you like a human colleague?", yes: "Yes, please", no: "No, thanks" };
const onSend = vi.fn();
const actions = { threadId: "thread-a", onSend, onPickOrder: vi.fn() };
const message: SupportUIMessage = { id: "m", role: "assistant", parts: [{ type: "text", text: "Would you like a refund or a human? Yes or no?" }] };
const render = (messages: SupportUIMessage[], allowQuickReplies = true) => renderToStaticMarkup(createElement(MessageList, {
  messages, busy: false, allowQuickReplies, onScenario: () => {}, actions,
}));
it("plain model wording never creates choices", () => {
  expect(render([message])).not.toContain('data-testid="quick-replies"');
  expect(evaluate({ quickRepliesShown: true }, { reply: "Yes, please / No, thanks", events: [] })).toEqual(["quickRepliesShown should be true"]);
  expect(evaluate({ quickRepliesShown: true }, { reply: "Choose", events: [{ id: "offer", ts: 0, kind: "widget", widget }] })).toEqual([]);
});
it("structured choices render real labels and never auto-send", () => {
  const html = renderToStaticMarkup(createElement(QuickReplies, { widget, active: true, actions }));
  expect(html).toContain("Yes, please"); expect(html).toContain("No, thanks");
  expect(html).not.toContain('disabled=""'); expect(onSend).not.toHaveBeenCalled();
});
it("thread switching and older/busy/inactive state disable both choices", () => {
  for (const props of [{ active: false, actions }, { active: true, actions: { ...actions, threadId: "thread-b" } }]) {
    const html = renderToStaticMarkup(createElement(QuickReplies, { widget, ...props }));
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  }
});
it("only the newest offer in the latest assistant message is usable, and takeover disables it", () => {
  const first = { ...widget, offerId: "older" };
  const withOffers: SupportUIMessage = { ...message, parts: [...message.parts, { type: "data-widget", data: first }, { type: "data-widget", data: widget }] };
  expect(render([withOffers]).match(/disabled=""/g)).toHaveLength(2);
  expect(render([withOffers], false).match(/disabled=""/g)).toHaveLength(4);
  expect(render([withOffers, { id: "next", role: "user", parts: [{ type: "text", text: "New question" }] }]).match(/disabled=""/g)).toHaveLength(4);
});
it("a resumed pushed answer carries the same structured choices as an ordinary response", () => {
  const pushed = toChatMessage({ kind: "chat_message", id: "event", ts: 0, entryId: "entry", role: "agent", text: "Please choose.", quickReplies: widget });
  expect(pushed.parts).toContainEqual({ type: "data-widget", data: widget });
  expect(render([pushed])).toContain('data-testid="quick-replies"');
});
