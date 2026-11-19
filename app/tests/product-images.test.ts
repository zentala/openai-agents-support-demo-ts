/** Catalog artwork is bundled, bounded and selected by exact names; unverified/foreign orders show no thumbnails. */
import { readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import orders from "@/data/orders.json";
import { productImage } from "@/lib/client/product-images";
import { listOrdersForCustomer } from "@/lib/data/store";
import { buildOrderPicker } from "@/lib/tools/order-picker";
import { OrderPicker } from "@/components/order-picker";
import { ProductThumbnail } from "@/components/product-thumbnail";
import { CustomerOrderDetails } from "@/components/customer-order";
import { ConversationPane } from "@/components/admin/conversation-pane";
import { customerOrderOf } from "@/lib/admin/customer-order";
import { createThread, removeThread } from "@/lib/runtime/threads";
import type { ThreadView } from "@/lib/admin/types";

it("ships a distinct local WebP of at most 60 KB for every catalog product", () => {
  const names = [...new Set(orders.flatMap((order) => order.items.map((item) => item.name)))];
  expect(names).toHaveLength(9);
  expect(new Set(names.map(productImage)).size).toBe(names.length);
  for (const name of names) {
    const source = productImage(name);
    expect(source).toMatch(/^\/products\/[a-z]+\.webp$/);
    const file = `public${source}`;
    expect(statSync(file).size).toBeLessThanOrEqual(60_000);
    const bytes = readFileSync(file);
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  }
});

it.each(["__proto__", "constructor", "https://foreign.example/photo.webp", "../secret", "Unknown product"])("unknown artwork %s cannot select a path or external request", (name) => {
  expect(productImage(name)).toBeUndefined();
  const html = renderToStaticMarkup(createElement(ProductThumbnail, { name }));
  expect(html).not.toContain("<img");
  expect(html).toContain('aria-hidden="true"');
});

it("picker artwork comes from only the given owned order, preserving the summary and inactive choice", () => {
  const order = listOrdersForCustomer("c-anna")[0];
  const widget = buildOrderPicker([order], "status");
  expect(widget.orders[0].productNames).toEqual(order.items.map((item) => item.name));
  const html = renderToStaticMarkup(createElement(OrderPicker, { widget, active: false, onPick: () => {} }));
  expect(html).toContain('src="/products/chair.webp"');
  expect(html).toContain('alt=""');
  expect(html).toContain("Oslo dining chair");
  expect(html).toContain("disabled");
  expect(html).not.toContain("table.webp");
});

it("an older picker card without product names uses a fallback and retains its choice", () => {
  const widget = buildOrderPicker(listOrdersForCustomer("c-james").slice(0, 1), "status");
  delete widget.orders[0].productNames;
  const html = renderToStaticMarkup(createElement(OrderPicker, { widget, active: true, onPick: () => {} }));
  expect(html).toContain("Oak coffee table");
  expect(html).toContain('data-testid="product-thumbnail"');
  expect(html).not.toContain("<img");
});

it("an unverified guest renders no catalog photo or product information", () => {
  const html = renderToStaticMarkup(createElement(CustomerOrderDetails, { view: { status: "unverified" } }));
  expect(html).toContain("Verify the guest");
  expect(html).not.toContain("product-thumbnail");
  expect(html).not.toContain("/products/");
});

it("Agent View and consultant rows use only the server's owned selection, with no arbitrary first order", () => {
  const thread = createThread("c-james");
  const render = () => {
    const view = customerOrderOf(thread);
    const consultant: ThreadView = { threadId: thread.threadId, customerId: thread.customerId, customerName: "James",
      traceId: thread.traceId, traceUrl: "", takeover: thread.takeover, transcript: [], ratings: {}, customerOrder: view };
    return [renderToStaticMarkup(createElement(CustomerOrderDetails, { view })),
      renderToStaticMarkup(createElement(ConversationPane, { thread: consultant, consultant: "Marta", acting: false,
        onHandBack: async () => true, onReply: async () => ({ ok: true as const }), onRate: () => {} }))];
  };
  try {
    for (const html of render()) expect(html).not.toContain("/products/");
    thread.memory.activeOrderId = "1004";
    for (const html of render()) {
      expect(html).toContain('src="/products/table.webp"');
      expect(html).toContain("Oak coffee table");
      expect(html).not.toContain("chair.webp");
    }
    thread.memory.activeOrderId = "1001";
    for (const html of render()) expect(html).not.toContain("/products/");
    thread.customerId = "guest";
    thread.memory.activeOrderId = "1004";
    for (const html of render()) expect(html).not.toContain("/products/");
  } finally { removeThread(thread.threadId); }
});
