/** Additional coordinator-requested icon states in the real host; explicit UI fixtures never execute business actions. */
const ready = (page) => page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);

async function selectCustomer(page, customerId) {
  const created = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/threads" && response.request().method() === "POST");
  await page.getByTestId("customer-select").selectOption(customerId);
  const response = await created;
  if (!response.ok()) throw new Error(`Review thread: HTTP ${response.status()}`);
  const { threadId } = await response.json();
  await ready(page);
  return threadId;
}

function addressFixture(route) {
  const id = "h13-address-preview", text = "Synthetic address display fixture; no model ran and no address was changed. See [returns-policy].";
  const widget = { type: "address-confirm", proposalId: "h13-display-only", orderId: "1004", prompt: "Synthetic preview: confirm the new address",
    oldAddress: { street: "10 Main Road", city: "London", postalCode: "SW1A 1AA", country: "GB" },
    newAddress: { street: "22 Elm Street", city: "Manchester", postalCode: "M1 4BT", country: "GB" } };
  const chunks = [{ type: "start", messageId: id }, { type: "text-start", id }, { type: "text-delta", id, delta: text },
    { type: "text-end", id }, { type: "data-widget", data: widget }, { type: "finish" }];
  return route.fulfill({ contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" },
    body: chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n" });
}

async function addressAndDialog({ page, check, docShot }, width) {
  await selectCustomer(page, "c-james");
  await page.route("**/api/chat", addressFixture);
  try {
    await page.getByTestId("chat-input").fill("Show the labelled address controls preview.");
    await page.getByTestId("send-button").click();
    const card = page.getByTestId("address-confirm");
    await card.waitFor();
    const yes = card.getByTestId("address-confirm-yes"), no = card.getByTestId("address-confirm-no");
    await yes.focus();
    await card.scrollIntoViewIfNeeded();
    check(`h13 R1: ${width}px address Confirm/Cancel have the correct icons`, await yes.locator('[data-icon="confirm"]').count() === 1 && await no.locator('[data-icon="cancel"]').count() === 1 && await yes.isEnabled() && await no.isEnabled());
    await docShot(page, `h13-address-confirm-${width}`);
    const chip = page.getByTestId("messages").getByTestId("source-chip").last();
    await chip.click();
    const dialog = page.getByTestId("kb-article-dialog"), close = dialog.getByRole("button", { name: "Close", exact: true });
    await close.focus();
    check(`h13 R1: ${width}px KB dialog Close uses its icon and 40px control`, await close.locator('[data-icon="close"]').count() === 1 && await close.evaluate((button) => button.getBoundingClientRect().height === 40));
    await docShot(page, `h13-kb-dialog-${width}`);
    await close.click();
    await dialog.waitFor({ state: "hidden" });
    check(`h13 R1: ${width}px actual Close returns focus to its citation`, await chip.evaluate((button) => document.activeElement === button));
  } finally { await page.unroute("**/api/chat", addressFixture); }
}

async function approvalFrame(c, width) {
  const { page, check, docShot, select } = c;
  const threadId = await selectCustomer(page, "c-lena");
  const fixture = async (route) => {
    const response = await route.fetch();
    if (!response.ok()) throw new Error(`Review console state: HTTP ${response.status()}`);
    const state = await response.json();
    const approval = { approvalId: "h13-display-approval", threadId, traceId: "synthetic-h13", toolName: "create_refund", args: {},
      customerId: "c-lena", customerName: "Lena Schmidt", agent: "Orders & Refunds Agent", summary: "Synthetic display fixture: 1450 PLN refund, no action will run.", createdAt: Date.now() };
    await route.fulfill({ response, json: { ...state, approvals: [approval], metrics: { ...state.metrics, approvals: { ...state.metrics.approvals, pending: 1 } } } });
  };
  await page.route("**/api/admin/state", fixture);
  try {
    await select("Consultant", "consultant");
    const card = page.getByTestId("console-approval-card");
    await card.waitFor();
    const yes = card.getByTestId("console-approve"), no = card.getByTestId("console-reject");
    await yes.focus();
    await card.scrollIntoViewIfNeeded();
    check(`h13 R1: ${width}px approval preview has correct Approve/Reject icons`, await yes.locator('[data-icon="confirm"]').count() === 1 && await no.locator('[data-icon="cancel"]').count() === 1 && await yes.isEnabled() && await no.isEnabled());
    await docShot(page, `h13-approval-${width}`);
    const metrics = page.getByTestId("metrics-strip");
    await metrics.scrollIntoViewIfNeeded();
    check(`h13 R1: ${width}px all metric tiles use their existing meanings`, await metrics.locator('[data-icon="ticket"], [data-icon="guardrail"], [data-icon="approval"], [data-icon="error"]').count() === 4);
    await docShot(page, `h13-metrics-${width}`);
  } finally { await page.unroute("**/api/admin/state", fixture); }
}

export async function checkReviewIconFrames(c) {
  const { page, baseUrl, select, check, docShot } = c;
  const viewport = page.viewportSize();
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.goto(baseUrl); await ready(page);
      check(`h13 R1: ${width}px reset keeps its tooltip and new meaning`, await page.getByRole("button", { name: "Reset conversation", exact: true }).getAttribute("title") === "Reset conversation" && await page.locator('[data-icon="reset"].lucide-refresh-ccw').count() === 1);
      check(`h13 R1: ${width}px rule-only starter uses the shared gray Cog badge`, await page.getByTestId("start-highlight-human-request").getByText("rule", { exact: true }).locator('[data-icon="automaticStep"]').count() === 1);
      await select("How it works", "how");
      await page.getByTestId("workspace").evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + scrollY));
      await page.getByTestId("how-it-works").evaluate((element) => { element.closest(".workspace-content").scrollTop = 0; });
      await docShot(page, `h13-how-it-works-${width}`);
      await select("Agent", "agent");
      await addressAndDialog(c, width);
      await approvalFrame(c, width);
      check(`h13 R1: ${width}px reviewed controls have no horizontal page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
  } finally { await page.setViewportSize(viewport); await page.goto(baseUrl); await ready(page); }
}
