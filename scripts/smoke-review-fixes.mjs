/** Review acceptance using real deterministic support flows; no OpenAI calls or provider changes. */
import { checkTypography } from "./smoke-typography.mjs";
import { checkMenuHints } from "./smoke-polish.mjs";

export async function prepareOverview({ page, check }, value) {
  if (value === "agent") {
    const agents = page.getByTestId("agents-list");
    check("layout: agent descriptions start collapsed", await agents.locator("details[open]").count() === 0);
    for (const summary of await agents.locator("summary").all()) await summary.click();
    await checkTypography(page, check, "expanded agent descriptions");
    for (const summary of await agents.locator("summary").all()) await summary.click();
    await page.locator('[data-testid="agent-panel"] .workspace-content').evaluate((el) => { el.scrollTop = 0; });
  }
  if (value === "consultant") {
    const queue = await page.getByRole("region", { name: "Needs a human" }).boundingBox();
    const metrics = await page.getByTestId("metrics-strip").boundingBox();
    check("layout: counted human queue precedes metrics", queue.y < metrics.y && await page.getByRole("heading", { name: /^\d+ needs? a human$/ }).count() === 1);
    check("layout: empty approvals are a single sentence", (await page.getByTestId("console-approvals").innerText()) === "Pending approvals: none");
    check("layout: conversation empty state is a plain sentence", await page.getByTestId("conversation-empty").evaluate((el) => el.tagName === "P" && getComputedStyle(el).boxShadow === "none"));
  }
}

export async function captureScenarioMenu({ page, check, shot }, width) {
  await page.getByTestId("customer-header").scrollIntoViewIfNeeded();
  await page.getByTestId("scenario-menu-trigger").click();
  const menu = page.getByRole("menu", { name: "Scenarios", exact: true });
  await menu.waitFor();
  await page.getByTestId("scenario-scroll-bottom").waitFor();
  const geometry = await menu.evaluate((el) => {
    const bounds = el.getBoundingClientRect();
    const header = document.querySelector('[data-testid="customer-header"]').getBoundingClientRect();
    const scroll = el.querySelector('[data-testid="scenario-scroll"]');
    return { height: bounds.height, viewport: innerHeight, top: bounds.top, headerBottom: Math.max(0, header.bottom), scrolls: scroll.scrollHeight > scroll.clientHeight };
  });
  check(`layout: ${width}px menu is bounded and leaves the customer header visible`, geometry.height <= geometry.viewport * 0.61 && geometry.top >= geometry.headerBottom && geometry.scrolls, JSON.stringify(geometry));
  await checkTypography(page, check, `scenario menu ${width}`);
  await shot(`scenario-menu-top-${width}`);
  await checkMenuHints({ page, check, shot }, width);
  for (const group of await menu.getByRole("group").all()) {
    const label = group.locator(":scope > div").first();
    await label.scrollIntoViewIfNeeded();
    const inside = await label.evaluate((el) => {
      const r = el.getBoundingClientRect(), m = el.closest('[role="menu"]').getBoundingClientRect();
      return r.top >= m.top && r.bottom <= m.bottom;
    });
    check(`layout: ${width}px scenario group is scroll-reachable: ${await label.innerText()}`, inside);
  }
  await page.getByTestId("reset-demo-data").scrollIntoViewIfNeeded();
  check(`layout: ${width}px scenario labels omit fixture numbering`, (await menu.getByRole("menuitem").allInnerTexts()).every((label) => !/^\d+\s/.test(label)));
  await shot(`scenario-menu-bottom-${width}`);
  await page.keyboard.press("Escape");
}

export async function rememberEscalation(c) {
  const text = await c.page.getByTestId("handler-ticket").innerText();
  c.state.ticketId = text.match(/T-\d+/)?.[0];
  const row = c.page.getByTestId("turn-trace").locator('li[data-status="waiting"]').filter({ hasText: `Waiting for a human · Ticket ${c.state.ticketId}` });
  c.check("layout: escalation is amber human work with a ticket number", await row.count() === 1 && (await row.innerText()).includes("model skipped"));
  c.check("layout: agent explicitly keeps answering before takeover", text.includes("the agent keeps answering until a consultant takes over"));
  c.check("layout: scenario chip has no numeric prefix", !/Scenario:\s*\d+\s/.test(await c.page.getByTestId("running-scenario").innerText()));
  const state = await c.page.evaluate(async () => (await fetch("/api/admin/state")).json());
  c.state.threadId = state.tickets.find((t) => t.id === c.state.ticketId)?.threadId;
}

export async function checkSelectedTicket({ page, check, state }) {
  await page.waitForFunction((id) => document.querySelector('[data-testid="conversation-ticket"]')?.textContent.includes(id), state.ticketId);
  const selected = page.locator(`[data-ticket-id="${state.ticketId}"]`);
  const border = await selected.evaluate((el) => ({ current: el.getAttribute("aria-current"), selected: getComputedStyle(el).borderTopColor, neutral: getComputedStyle(document.querySelector('[data-testid="metrics-strip"] > div')).borderTopColor }));
  check("layout: selected ticket has aria-current and a distinct border", border.current === "true" && border.selected !== border.neutral, JSON.stringify(border));
  await page.waitForFunction(() => {
    const r = document.querySelector('[data-testid="conversation-pane"]').getBoundingClientRect();
    return r.top >= 0 && r.top < innerHeight && r.bottom > 0;
  });
  check("layout: opening the ticket automatically brings its numbered conversation into view", (await page.getByTestId("conversation-ticket").innerText()).includes(state.ticketId) && await page.getByTestId("conversation-ticket").isVisible());
  check("layout: consultant explains agent behavior before takeover", (await page.getByTestId("conversation-pane").innerText()).includes(`Ticket ${state.ticketId} open — the agent keeps answering until a consultant takes over`));
}

export async function captureReviewFrames(c) {
  const { page, select, check, shot } = c;
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await select("Agent", "agent");
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(`stacked-${width}`);
    await page.locator('[data-testid="workspace"] > header').scrollIntoViewIfNeeded();
    const header = await page.locator('[data-testid="workspace"] > header').evaluate((el) => {
      const workspace = el.parentElement;
      const tab = workspace.querySelector('[role="tab"][aria-selected="true"]');
      const tabs = workspace.querySelector('[role="tablist"]').getBoundingClientRect();
      return { height: el.getBoundingClientRect().height, tabsBelow: tabs.top >= el.getBoundingClientRect().bottom, underline: getComputedStyle(tab).borderBottomWidth, weight: getComputedStyle(tab).fontWeight };
    });
    check(`layout: ${width}px header has a separate tab bar and stable active weight`, header.height <= 60 && header.tabsBelow && header.underline === "3px" && Number(header.weight) === 600, JSON.stringify(header));
    await shot(`agent-escalation-${width}`);
    check(`layout: ${width}px chat height hints the panel below`, await page.getByTestId("customer-view").evaluate((el) => el.getBoundingClientRect().height <= innerHeight * 0.62));
    await captureScenarioMenu(c, width);
    await select("Consultant", "consultant");
    await page.locator(`[data-ticket-id="${c.state.ticketId}"]`).getByTestId("open-conversation").click();
    await checkSelectedTicket(c);
    await page.getByTestId("conversation-pane").scrollIntoViewIfNeeded();
    await checkTypography(page, check, `consultant ${width}`);
    await shot(`consultant-selected-${width}`);
    await select("How it works", "how");
    await page.locator('[data-testid="workspace"] > header').scrollIntoViewIfNeeded();
    await checkTypography(page, check, `explainer ${width}`);
    await shot(`how-top-${width}`);
  }
}

export async function checkResolution(c) {
  const { page, baseUrl, select, check, state, shot } = c;
  await page.setViewportSize({ width: 768, height: 844 });
  await page.goto(new URL("/?tab=agent", baseUrl).href);
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="consultant-badge"]')?.textContent) > 0);
  check("layout: existing queue does not flash amber after reload", await page.getByTestId("consultant-badge").getAttribute("data-unseen") === "false");
  await select("Consultant", "consultant");
  await page.locator(`[data-ticket-id="${state.ticketId}"]`).getByTestId("open-conversation").click();
  await page.getByTestId("conversation-pane").waitFor();
  await page.getByTestId("take-over-button").click();
  await page.locator('[data-testid="conversation-pane"][data-handler="human"]').waitFor();
  const consultant = await page.getByTestId("consultant-select").inputValue();
  check("layout: takeover names the actual handler", (await page.getByTestId("conversation-pane").innerText()).includes(`Handled by ${consultant}`));
  await page.getByTestId("hand-back-button").click();
  const history = page.locator("details").filter({ has: page.locator("summary", { hasText: "History" }) });
  await history.locator("summary").click();
  const resolved = history.locator(`[data-ticket-id="${state.ticketId}"][data-status="resolved"]`);
  await resolved.waitFor();
  check("layout: real hand-back keeps the resolved ticket in History", await resolved.isVisible() && (await resolved.innerText()).includes("resolved"));
  check("h08: History uses local ISO date and 24-hour time", /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(await resolved.innerText()));
  await resolved.scrollIntoViewIfNeeded();
  await shot("resolved-history-768");
}

export async function checkRejectedMetrics({ page, check }) {
  const results = await page.evaluate(async () => {
    const state = () => fetch("/api/admin/state").then((r) => r.json());
    const before = (await state()).metrics.conversations;
    const replies = [];
    for (const selection of [undefined, { type: "order", orderId: "2001" }]) {
      const made = await fetch("/api/threads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: "c-anna" }) }).then((r) => r.json());
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: made.threadId, selection, messages: [{ role: "user", parts: [{ type: "text", text: selection ? "Pick this" : "Sent from my iPhone" }] }] }) });
      replies.push(await response.text());
    }
    return { before, after: (await state()).metrics.conversations, emptyRefused: replies[0].includes("empty after removing"), selectionRefused: replies[1].includes("could not use that selection") };
  });
  check("layout: rejected EmptyMessage/InvalidSelection turns do not inflate conversations", results.emptyRefused && results.selectionRefused && results.before === results.after, JSON.stringify(results));
}
