/** Real browser actions shared by the gallery recorder; no synthetic transcripts or fixed rectangles. */
export const viewport = { width: 1440, height: 900 };
const test = (page, id) => page.getByTestId(id);

export async function settle(page) {
  await page.waitForFunction(() => !document.querySelector('[data-testid="working"]') &&
    document.querySelector('[data-testid="send-button"]')?.disabled === false, null, { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
}

export async function act(page, step) {
  if (step.action === "draft") await test(page, "chat-input").fill(step.text);
  else if (step.action === "send") {
    await test(page, "chat-input").fill(step.text.replaceAll("{{today}}", new Date().toISOString().slice(0, 10)));
    const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api/chat" && r.request().method() === "POST");
    await test(page, "send-button").click();
    const result = await response;
    if (!result.ok()) throw new Error(`GalleryChatHTTP: ${result.status()}`);
    await result.finished();
    await settle(page);
    if (await test(page, "error-card").count()) throw new Error(`GalleryRuntimeError: ${await test(page, "error-card").allTextContents()}`);
  } else if (step.action === "consultant") {
    const ticket = (await test(page, "handler-ticket").innerText()).match(/T-\d+/)?.[0];
    if (!ticket) throw new Error("GalleryTicketMissing");
    await page.getByRole("tab", { name: /^Consultant/ }).click();
    await page.locator(`[data-ticket-id="${ticket}"]`).getByTestId("open-conversation").click();
    // The UI combines takeover and first reply. Use the existing separate action to expose both real states.
    const taken = await page.evaluate(async () => {
      const threadId = new URLSearchParams(location.hash.slice(1)).get("thread");
      const consultant = document.querySelector('[data-testid="consultant-select"]').value;
      const result = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "take_over", threadId, consultant }) });
      return result.ok && (await result.json()).ok;
    });
    if (!taken) throw new Error("GalleryTakeoverFailed");
    await page.locator('[data-testid="conversation-pane"][data-handler="human"]').waitFor();
    await test(page, "human-banner").waitFor();
    await test(page, "reply-input").fill("Hello, I am here to help with your order.");
  } else if (step.action === "reply") {
    await test(page, "reply-send").click();
    await test(page, "message-consultant").last().waitFor();
    await test(page, "human-banner").waitFor();
  } else if (step.action === "approve") {
    await page.getByRole("tab", { name: /^Consultant/ }).click();
    const response = page.waitForResponse("**/api/admin/actions");
    await test(page, "console-approve").last().click();
    if (!(await response).ok()) throw new Error("GalleryApprovalFailed");
    await test(page, "console-approval-card").waitFor({ state: "detached" });
    await page.getByRole("tab", { name: "Agent", exact: true }).click();
    await page.locator('[data-testid="approval-card"][data-status="approved"]').waitFor();
    await settle(page);
  } else if (step.action === "expandEvent") {
    // Open one run-log row (the Agent View inspector) so its full JSON, e.g. a tool result, is readable.
    const row = page.locator(`[data-testid="runner-event"][data-kind="${step.kind}"]`).filter({ hasText: step.hasText }).last();
    await row.scrollIntoViewIfNeeded();
    await row.getByRole("button").click();
    // Centre the JSON so its last lines (the order note) are not cut off by the run-log scroll box.
    await row.locator("pre").evaluate(el => el.scrollIntoView({ block: "center" }));
  } else if (step.action === "confirmAddress") {
    await test(page, "address-confirm-yes").last().click();
    await page.locator('[data-testid="runner-event"][data-kind="address_change"]').filter({ hasText: "applied" }).last().waitFor();
    await settle(page);
  } else throw new Error(`UnknownGalleryAction: ${step.action}`);
  if (step.assertText && !(await page.locator("body").innerText()).includes(step.assertText)) {
    throw new Error(`GalleryExpectedText: ${step.assertText}`);
  }
}

export async function focusBox(page, selector) {
  const element = page.locator(selector).last();
  await element.waitFor({ state: "visible" });
  await element.scrollIntoViewIfNeeded();
  // The DOM owns the bounds. Intersect with the visible viewport for partially scrolling elements.
  const bounds = await element.boundingBox();
  if (!bounds) throw new Error(`GalleryFocusMissing: ${selector}`);
  const x = Math.max(0, bounds.x), y = Math.max(0, bounds.y);
  const width = Math.min(viewport.width, bounds.x + bounds.width) - x;
  const height = Math.min(viewport.height, bounds.y + bounds.height) - y;
  if (width <= 0 || height <= 0) throw new Error(`GalleryFocusOutsideViewport: ${selector}`);
  return { x, y, width, height };
}
