/** Final layout evidence in the actual host: real owned selection, then labelled synthetic cards. No inference. */
import { readFileSync } from "node:fs";
// Node 22.18+ strips these types; only the catalog lookup and KB text parser are used, with no model/run path.
import { productImage } from "../app/lib/client/product-images.ts";
import { chunkBody, parseArticle } from "../app/lib/kb/load.ts";

const orders = JSON.parse(readFileSync(new URL("../app/data/orders.json", import.meta.url), "utf8"));
const products = [...new Set(orders.flatMap((order) => order.items.map((item) => item.name)))].map((name) => ({ name, url: productImage(name) }));
const policy = parseArticle(readFileSync(new URL("../app/data/kb/returns-policy.md", import.meta.url), "utf8"));
const policyTitle = policy.title;
const policySnippet = chunkBody(policy.body.replace(/^#{1,6}\s.*$/gm, ""))[0];
const ready = (page) => page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);

async function staffAction(page, threadId, type) {
  return page.evaluate(async ({ threadId, type }) => {
    const response = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, threadId, consultant: "Marta Nowak" }) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(`${type}: HTTP ${response.status}, ${result.errorType ?? "UnknownError"}: ${result.message ?? ""}`);
  }, { threadId, type });
}

async function primeOwnedSelection(page, threadId) {
  await staffAction(page, threadId, "take_over");
  await page.getByTestId("human-banner").waitFor();
  return page.evaluate(async (id) => {
    const read = async () => {
      const response = await fetch(`/api/admin/threads/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error(`Owned profile: HTTP ${response.status}`);
      return response.json();
    };
    const before = await read();
    // SECURITY: do not make the real chat request unless the existing human branch is proven active.
    if (before.customerId !== "c-anna" || before.takeover.status !== "human" || before.takeover.consultant !== "Marta Nowak") throw new Error("Owned human branch was not established");
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: id, selection: { type: "order", orderId: "1001" }, messages: [{ role: "user", parts: [{ type: "text", text: "Select my order 1001 for the consultant." }] }] }) });
    if (!response.ok) throw new Error(`Owned order selection: HTTP ${response.status}`);
    await response.text();
    const after = await read();
    if (after.customerId !== "c-anna" || after.customerOrder.status !== "verified" || after.customerOrder.order?.orderId !== "1001") throw new Error("Real owned selection did not bind order 1001");
    return { customerId: after.customerId, orderId: after.customerOrder.order.orderId };
  }, threadId);
}

async function productHttp({ page, check }) {
  const rows = await page.evaluate(async (catalog) => Promise.all(catalog.map(async ({ name, url }) => {
    const response = await fetch(url);
    return { name, status: response.status, type: response.headers.get("Content-Type"), bytes: (await response.arrayBuffer()).byteLength };
  })), products);
  check("h11: all nine product assets use the actual host", rows.length === 9);
  for (const row of rows) check(`h11: actual-host WebP HTTP 200 and <=60KB: ${row.name}`, row.status === 200 && row.type?.includes("image/webp") && row.bytes > 0 && row.bytes <= 60_000);
}

async function visiblePhoto({ page, check }, scope, pathname, label) {
  const expected = new URL(pathname, page.url());
  const image = scope.locator(`img:is([src=${JSON.stringify(expected.pathname)}],[src=${JSON.stringify(expected.href)}])`);
  await image.scrollIntoViewIfNeeded();
  await image.evaluate((img) => img.decode());
  const fit = await image.evaluate((img, expected) => {
    const actual = new URL(img.currentSrc || img.src, location.href);
    const r = img.getBoundingClientRect();
    const container = img.closest('[data-testid="messages"],.workspace-content') ?? document.documentElement;
    const b = container.getBoundingClientRect();
    return actual.origin === expected.origin && actual.pathname === expected.pathname
      && img.complete && img.naturalWidth > 0 && r.width === 48 && r.height === 48
      && r.top >= Math.max(0, b.top) - 1 && r.bottom <= Math.min(innerHeight, b.bottom) + 1
      && r.left >= Math.max(0, b.left) - 1 && r.right <= Math.min(innerWidth, b.right) + 1;
  }, { origin: expected.origin, pathname: expected.pathname });
  check(`h11: ${label} is decoded and visible at 48px in its containing panel`, fit);
}

async function ownedFrames(c, threadId, width) {
  const { page, select, check, docShot } = c;
  await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
  await select("Agent", "agent");
  const profile = page.getByTestId("customer-order");
  await profile.getByTestId("customer-active-order").waitFor();
  await profile.scrollIntoViewIfNeeded();
  await visiblePhoto(c, profile, "/products/chair.webp", `${width}px real owned profile photo`);
  const text = await profile.innerText();
  check(`h11: ${width}px real Customer & order distinguishes profile and selected delivery`, ["Anna Kowalska", "Email", "Language", "Default address", "Active order #1001", "Oslo dining chair", "Current delivery address"].every((part) => text.includes(part)));
  await docShot(page, `h11-d-owned-profile-${width}`);
  await profile.getByRole("button", { name: "Customer & order", exact: true }).focus();
  await docShot(page, `h11-d-owned-profile-focus-${width}`);
  await select("Consultant", "consultant");
  await page.evaluate((id) => { window.location.hash = `#thread=${encodeURIComponent(id)}`; }, threadId);
  const selected = page.getByTestId("consultant-active-order");
  await selected.getByText("Active order #1001", { exact: true }).waitFor();
  await visiblePhoto(c, selected, "/products/chair.webp", `${width}px real consultant photo`);
  await docShot(page, `h11-d-owned-consultant-${width}`);
}

function cardFixture() {
  let requests = 0;
  const handler = (route) => {
    requests++;
    const { threadId } = route.request().postDataJSON();
    const picker = { type: "order-picker", prompt: "Synthetic UI preview: public catalog illustrations, not order records", orders: products.map(({ name }, index) => ({
      orderId: `preview-${index + 1}`, summary: name, productNames: [name], status: "Illustration", total: 0, currency: "PLN", eligible: true,
    })) };
    const quick = { type: "quick-replies", threadId, offerId: `preview-offer-${requests}`, prompt: "Would you like a human colleague to help?", yes: "Yes, please", no: "No, thanks" };
    const id = `h11-capture-${requests}`;
    const kb = { id: `kb-preview-${requests}`, ts: Date.now(), kind: "kb_hits", query: "Synthetic UI preview: chair return policy", hits: [{ id: "returns-policy", title: policyTitle, snippet: policySnippet, score: 0.85 }] };
    // UI transport only: this injected KB event is not evidence about customer/inspector serialization.
    const chunks = [{ type: "start", messageId: id }, { type: "text-start", id },
      { type: "text-delta", id, delta: "Synthetic UI transport fixture. No model ran. See [returns-policy]." }, { type: "text-end", id },
      { type: "data-agent-event", data: kb }, { type: "data-widget", data: picker }, { type: "data-widget", data: quick }, { type: "finish" }];
    return route.fulfill({ contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n" });
  };
  return { handler, count: () => requests };
}

async function previewFrames(c, fixture, width, expectedRequests) {
  const { page, select, check, docShot } = c;
  await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
  await select("Agent", "agent");
  await page.getByTestId("chat-input").fill("Show the labelled UI capture fixture.");
  const sent = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/chat" && request.method() === "POST", { timeout: 10000 });
  await page.getByTestId("send-button").click();
  const response = await (await sent).response();
  if (!response) throw new Error("Capture fixture response missing");
  await response.finished();
  const hit = page.getByTestId("kb-hit").last();
  const chip = hit.getByTestId("source-chip");
  await chip.scrollIntoViewIfNeeded();
  await chip.hover();
  await docShot(page, `h11-d-kb-hover-${width}`);
  await chip.focus();
  check(`h11: ${width}px lightweight KB result keeps its source action focusable`, await chip.evaluate((element) => element === document.activeElement));
  await docShot(page, `h11-d-kb-focus-${width}`);
  const picker = page.getByTestId("order-picker").last();
  for (let i = 0; i < products.length; i++) await visiblePhoto(c, picker, products[i].url, `${width}px synthetic catalog ${products[i].name}`);
  await picker.getByRole("button").first().hover();
  await docShot(page, `h11-d-picker-preview-hover-${width}`);
  await picker.getByRole("button").first().focus();
  await docShot(page, `h11-d-picker-preview-focus-${width}`);
  const yes = page.getByTestId("quick-reply-yes").last();
  await yes.scrollIntoViewIfNeeded();
  await yes.hover();
  await docShot(page, `h11-d-quick-replies-hover-${width}`);
  await yes.focus();
  check(`h11: ${width}px structured reply is enabled and keyboard focused in the actual chat panel`, await yes.isEnabled() && await yes.evaluate((element) => element === document.activeElement));
  await docShot(page, `h11-d-quick-replies-focus-${width}`);
  check(`h11: ${width}px preview hover/focus never sends a reply or picker selection`, fixture.count() === expectedRequests);
  check(`h11: ${width}px capture surfaces have no horizontal page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}

async function releaseOwned(page, threadId) {
  const handler = await page.evaluate(async (id) => {
    const response = await fetch(`/api/admin/threads/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(`Capture cleanup read: HTTP ${response.status}`);
    return (await response.json()).takeover;
  }, threadId);
  if (handler.status !== "human") return;
  if (handler.consultant !== "Marta Nowak") throw new Error("Capture cleanup found another consultant; no hand-back attempted");
  await staffAction(page, threadId, "hand_back");
}

async function guestLanguageFrames({ page, select, check, docShot }) {
  const customer = JSON.parse(readFileSync(new URL("../app/data/customers.json", import.meta.url), "utf8")).find((item) => item.id === "c-james");
  let requests = 0;
  const handler = (route) => {
    requests++;
    const events = [
      { id: "guest-preview-verified", ts: 1, kind: "verification", outcome: "verified", customerId: customer.id, customerName: customer.name },
      { id: "guest-preview-model-context", ts: 2, kind: "context_update", changes: { language: { from: null, to: "pl" } } },
    ];
    // Synthetic rendering only: the real guest thread is NOT verified or rebound on the server.
    const id = "guest-language-preview";
    const chunks = [{ type: "start", messageId: id }, { type: "text-start", id },
      { type: "text-delta", id, delta: "Synthetic guest-language UI transport fixture. No verification or model ran." }, { type: "text-end", id },
      ...events.map((data) => ({ type: "data-agent-event", data })), { type: "finish" }];
    return route.fulfill({ contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n" });
  };
  await page.route("**/api/chat", handler);
  try {
    await select("Agent", "agent");
    const created = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/threads" && response.request().method() === "POST" && response.request().postDataJSON()?.customerId === "guest", { timeout: 10000 });
    await page.getByTestId("customer-select").selectOption("guest");
    if (!(await created).ok()) throw new Error("Guest capture thread creation failed");
    await ready(page);
    const value = (field) => page.getByTestId(`context-field-${field}`).locator("[data-context-value]");
    await page.waitForFunction(() => document.querySelector('[data-testid="context-field-customer_id"] [data-context-value]')?.textContent === "guest");
    check("h11: synthetic guest-language preview starts as an actual unverified guest UI", await value("language").innerText() === "null");
    await page.getByTestId("chat-input").fill("Render the labelled guest-language fixture.");
    const delivered = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/chat" && response.request().method() === "POST", { timeout: 10000 });
    await page.getByTestId("send-button").click();
    await (await delivered).finished();
    await page.waitForFunction(() => document.querySelector('[data-testid="context-field-language"]')?.getAttribute("data-changed") === "true");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      check(`h11: ${width}px synthetic verified identity uses public language and ignores contradictory model context`, await value("customer_id").innerText() === customer.id && await value("customer_name").innerText() === customer.name && await value("language").innerText() === customer.language);
      await page.getByTestId("context").scrollIntoViewIfNeeded();
      await docShot(page, `h11-d-guest-language-synthetic-${width}`);
    }
    check("h11: synthetic guest-language preview sends exactly one intercepted request", requests === 1);
  } finally { await page.unroute("**/api/chat", handler); }
}

export async function checkH11Captures(c) {
  const { page, baseUrl, check } = c;
  const viewport = page.viewportSize();
  const fixture = cardFixture();
  let threadId;
  let routed = false;
  try {
    const created = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/threads" && response.request().method() === "POST", { timeout: 10000 });
    await page.goto(baseUrl);
    const response = await created;
    if (!response.ok()) throw new Error(`Capture thread: HTTP ${response.status()}`);
    ({ threadId } = await response.json());
    await ready(page);
    const owned = await primeOwnedSelection(page, threadId);
    check("h11: real owned order selected through human-handled chat without inference", owned.customerId === "c-anna" && owned.orderId === "1001");
    await productHttp(c);
    for (const width of [1440, 390]) await ownedFrames(c, threadId, width);
    await releaseOwned(page, threadId);
    await page.getByTestId("human-banner").waitFor({ state: "detached" });
    await page.route("**/api/chat", fixture.handler); routed = true;
    for (const [index, width] of [1440, 390].entries()) await previewFrames(c, fixture, width, index + 1);
    await page.unroute("**/api/chat", fixture.handler); routed = false;
    await guestLanguageFrames(c);
  } finally {
    if (routed) await page.unroute("**/api/chat", fixture.handler);
    if (threadId) {
      try { await releaseOwned(page, threadId); }
      catch (error) { check("h11: capture-owned takeover cleanup", false, error.message); }
    }
    await page.setViewportSize(viewport);
    await page.goto(baseUrl);
    await ready(page);
  }
}
