/** Exercise the real registry renderer's size and accessibility contract without a browser or network. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Icon } from "@/components/icon";
import { ICONS } from "@/lib/ui/icons";

it("registers no Lucide component under two meanings", () => {
  const seen = new Map<unknown, string>();
  for (const [key, glyph] of Object.entries(ICONS)) {
    expect(seen.get(glyph), `${key} must not reuse ${seen.get(glyph)}`).toBeUndefined();
    seen.set(glyph, key);
  }
});

it("defaults to a decorative, unfocusable 16px semantic icon", () => {
  const html = renderToStaticMarkup(createElement(Icon, { name: "ticket" }));
  expect(html).toContain('data-icon="ticket"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('focusable="false"');
  expect(html).toContain('width="16"');
  expect(html).not.toContain('role="img"');
});

it("exposes an explicit image label and requested size", () => {
  const html = renderToStaticMarkup(createElement(Icon, { name: "knowledge", label: "Knowledge source", size: 20 }));
  expect(html).toContain('aria-label="Knowledge source"');
  expect(html).toContain('role="img"');
  expect(html).toContain('width="20"');
  expect(html).not.toContain('aria-hidden="true"');
});

it("renders the official GitHub mark as a filled accessible registry glyph", () => {
  const html = renderToStaticMarkup(createElement(Icon, { name: "github", size: 20, label: "GitHub" }));
  expect(html).toContain('width="20"'); expect(html).toContain('aria-label="GitHub"');
  expect(html).toContain('fill="currentColor"'); expect(html).toContain('stroke="none"');
  expect(ICONS.github.displayName).toBe("GitHubMark");
});
