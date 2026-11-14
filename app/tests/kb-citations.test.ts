/**
 * Chat citation rendering treats model text as text and recognizes only repository source IDs.
 * Server rendering exercises React's escaping boundary without a model or browser network request.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CitationText, KbSourcesProvider } from "@/components/kb-sources";
import { MessageList } from "@/components/message-list";
import type { KbArticle, SupportUIMessage } from "@/lib/types";

const articles: KbArticle[] = [{ id: "delivery-times", title: "Delivery times", body: "Full policy text." }];
const render = (text: string, sources = articles) => renderToStaticMarkup(
  createElement(KbSourcesProvider, { articles: sources }, createElement(CitationText, { text })),
);

describe("KB citations", () => {
  it("turns known IDs, including repeated citations, into titled dialog buttons", () => {
    const html = render("See [delivery-times], then [delivery-times].");
    expect(html.match(/data-testid="source-chip"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Read source: Delivery times"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("[delivery-times]");
  });

  it("keeps unknown IDs and URL-like citations inert", () => {
    const html = render("[unknown] [../../private] [https://example.com] [javascript:alert(1)]");
    expect(html).toContain("[unknown] [../../private] [https://example.com] [javascript:alert(1)]");
    expect(html).not.toContain('data-testid="source-chip"');
    expect(html).not.toContain("href=");
  });

  it("escapes raw model markup and article titles rather than executing it", () => {
    const html = render('<script>alert(1)</script> [delivery-times]', [{ ...articles[0], title: '<img src=x onerror="alert(1)">' }]);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img");
    expect(html).not.toMatch(/<script|<img|href=/);
  });

  it("does not turn the customer's own message into an authoritative source chip", () => {
    const message: SupportUIMessage = { id: "customer", role: "user", parts: [{ type: "text", text: "[delivery-times]" }] };
    const html = renderToStaticMarkup(createElement(KbSourcesProvider, { articles },
      createElement(MessageList, {
        messages: [message], busy: false, onScenario: () => {},
        actions: { threadId: null, onPickOrder: () => {}, onSend: () => {} },
      }),
    ));
    expect(html).toContain("[delivery-times]");
    expect(html).not.toContain('data-testid="source-chip"');
  });
});
