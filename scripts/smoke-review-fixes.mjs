/** Review acceptance using real deterministic support flows; no OpenAI calls or provider changes. */
import { checkTypography } from "./smoke-typography.mjs";
import { checkMenuHints } from "./smoke-polish.mjs";
import path from "node:path";

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
  check("layout: reply composer offers one takeover-and-reply action", await page.getByTestId("reply-send").innerText() === "Take over and reply" && await page.getByTestId("take-over-button").count() === 0);
  await captureComposer(page, "take-over-reply");
  await checkFailedDraft(c);
  await checkToneWarning(c);
  await page.locator('[data-testid="conversation-pane"][data-handler="human"]').waitFor();
  const consultant = await page.getByTestId("consultant-select").inputValue();
  check("layout: takeover names the actual handler", (await page.getByTestId("conversation-pane").innerText()).includes(`Handled by ${consultant}`));
  await checkComposerSwitches(c);
  const note = "Ask for a clear package photo before discussing refund options.";
  await page.getByTestId("hand-back-note").fill(note);
  await captureComposer(page, "hand-back-note");
  await page.getByTestId("hand-back-button").click();
  await checkPrivateHandBack(c, note);
  const history = page.locator("details").filter({ has: page.locator("summary", { hasText: "History" }) });
  await history.locator("summary").click();
  const resolved = history.locator(`[data-ticket-id="${state.ticketId}"][data-status="resolved"]`);
  await resolved.waitFor();
  check("layout: real hand-back keeps the resolved ticket in History", await resolved.isVisible() && (await resolved.innerText()).includes("resolved"));
  check("h08: History uses local ISO date and 24-hour time", /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(await resolved.innerText()));
  await resolved.scrollIntoViewIfNeeded();
  await shot("resolved-history-768");
}

/** Existing layout-only run exercises real staff HTTP actions; no customer model turn is needed. */
async function checkToneWarning({ page, check, expectConflict }) {
  const input = page.getByTestId("reply-input");
  const draft = "You are an idiot";
  await input.fill(draft);
  await expectConflict("first tone warning", "StaffToneWarning", () => page.getByTestId("reply-send").click());
  await page.getByTestId("reply-tone-warning").waitFor();
  check("h11: first tone warning does not take over or send", await page.getByTestId("conversation-pane").getAttribute("data-handler") === "agent"
    && !(await page.getByTestId("transcript").innerText()).includes(draft));
  check("h11: ordinary Send pauses for explicit acknowledgement", await page.getByTestId("reply-send").isDisabled());
  await captureComposer(page, "staff-warning");
  await input.fill("I can help with this request.");
  check("h11: editing invalidates tone acknowledgement", await page.getByTestId("reply-tone-warning").count() === 0 && await page.getByTestId("reply-send").isEnabled());
  await input.fill(draft);
  await expectConflict("edited tone warning", "StaffToneWarning", () => page.getByTestId("reply-send").click());
  await page.getByTestId("reply-tone-warning").waitFor();
  const selector = page.getByTestId("consultant-select");
  const original = await selector.inputValue();
  const other = await selector.locator("option").evaluateAll((options, current) => options.find((option) => option.value !== current).value, original);
  await selector.selectOption(other);
  check("h11: changing consultant clears draft and acknowledgement", await input.inputValue() === "" && await page.getByTestId("reply-tone-warning").count() === 0);
  await selector.selectOption(original);
  await input.fill(draft);
  await expectConflict("tone warning after consultant reset", "StaffToneWarning", () => page.getByTestId("reply-send").click());
  await page.getByTestId("reply-tone-warning").waitFor();
  await page.getByTestId("reply-send-anyway").click();
  await page.locator('[data-testid="transcript-consultant"]', { hasText: draft }).waitFor();
  check("h11: explicit resend delivers once and clears the draft", await page.getByTestId("transcript-consultant").filter({ hasText: draft }).count() === 1 && await input.inputValue() === "");
}

/** Labeled HTTP failure fixture exercises the real fetch-error path; no reply reaches the server. */
async function checkFailedDraft({ page, check, expectConflict }) {
  const draft = "Keep this draft after the synthetic failed send.";
  const refuse = (route) => route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ ok: false, errorType: "SyntheticSendFailure", message: "Offline smoke fixture" }) });
  await page.route("**/api/admin/actions", refuse);
  try {
    await page.getByTestId("reply-input").fill(draft);
    await expectConflict("synthetic failed send", "SyntheticSendFailure", () => page.getByTestId("reply-send").click());
    await page.getByTestId("console-error").filter({ hasText: "SyntheticSendFailure" }).waitFor();
    check("h11: synthetic failed send retains draft without takeover", await page.getByTestId("reply-input").inputValue() === draft && await page.getByTestId("conversation-pane").getAttribute("data-handler") === "agent");
  } finally { await page.unroute("**/api/admin/actions", refuse); }
}

async function captureComposer(page, name) {
  const viewport = page.viewportSize();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.getByTestId("reply-composer").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.resolve("docs/screenshots", `h11-b-${name}-${width}.png`) });
  }
  await page.setViewportSize(viewport);
}

/** Real owned threads, keyed drafts and deliberately delayed old-thread HTTP response. */
async function checkComposerSwitches(c) {
  const { page, check, state } = c;
  const otherId = await page.evaluate(async () => {
    const response = await fetch("/api/threads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: "c-anna" }) });
    if (!response.ok) throw new Error(`Create smoke thread: ${response.status}`);
    return (await response.json()).threadId;
  });
  await dirtyComposer(c, "warning before consultant switch");
  const selector = page.getByTestId("consultant-select");
  const original = await selector.inputValue();
  const other = await selector.locator("option").evaluateAll((options, current) => options.find((option) => option.value !== current).value, original);
  await selector.selectOption(other);
  await selector.selectOption(original);
  check("h11: consultant switch clears draft, tone acknowledgement and hand-back note", await cleanComposer(page));
  await dirtyComposer(c, "warning before thread switch");
  await chooseThread(page, otherId, "Anna Kowalska");
  check("h11: thread switch clears draft and tone acknowledgement", await page.getByTestId("reply-input").inputValue() === "" && await page.getByTestId("reply-tone-warning").count() === 0);
  await chooseThread(page, state.threadId, "James Carter");
  check("h11: returning to the original thread does not restore a stale note or draft", await cleanComposer(page));
  await checkDelayedThread(c, otherId);
  await chooseThread(page, state.threadId, "James Carter");
}

async function dirtyComposer({ page, expectConflict }, origin) {
  await page.getByTestId("hand-back-note").fill("Private unsent note for this thread only.");
  await page.getByTestId("reply-input").fill("This is stupid");
  await expectConflict(origin, "StaffToneWarning", () => page.getByTestId("reply-send").click());
  await page.getByTestId("reply-tone-warning").waitFor();
}
const cleanComposer = async (page) => await page.getByTestId("reply-input").inputValue() === ""
  && await page.getByTestId("reply-tone-warning").count() === 0 && await page.getByTestId("hand-back-note").inputValue() === "";
async function chooseThread(page, threadId, name) {
  await page.evaluate((id) => { window.location.hash = `#thread=${encodeURIComponent(id)}`; }, threadId);
  await page.getByTestId("conversation-pane").getByText(name, { exact: true }).waitFor();
}

async function checkDelayedThread({ page, check, state }, otherId) {
  const pattern = `**/api/admin/threads/${state.threadId}`;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let held = false;
  let heldRequest;
  const delay = async (route) => {
    if (held) return route.continue();
    held = true;
    heldRequest = route.request();
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  };
  await page.route(pattern, delay);
  try {
    await page.waitForRequest(pattern, { timeout: 10000 }); // Existing 1.5s console poll, not a model turn.
    await chooseThread(page, otherId, "Anna Kowalska");
    if (!heldRequest) throw new Error("The old-thread request was not held");
    const delivered = page.waitForResponse((response) => response.request() === heldRequest, { timeout: 10000 });
    release();
    const oldResponse = await delivered;
    await oldResponse.finished();
    check("h11: exact deliberately held old-thread response finished before view assertion", oldResponse.request() === heldRequest && (await oldResponse.json()).threadId === state.threadId);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    check("h11: delayed old-thread response cannot replace selected customer's view", await page.getByTestId("conversation-pane").getByText("Anna Kowalska", { exact: true }).isVisible());
  } finally { release(); await page.unroute(pattern, delay); }
}

async function checkPrivateHandBack({ page, check, state }, note) {
  await page.getByTestId("staff-instruction").filter({ hasText: note }).waitFor();
  const proof = await page.evaluate(async (threadId) => {
    const read = async (url) => {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 10000);
      try {
        const response = await fetch(url, { signal: abort.signal });
        if (!response.ok) throw new Error(`Channel HTTP ${response.status}`);
        const reader = response.body.getReader();
        let replay = "";
        while (!replay.includes(": connected")) {
          const chunk = await reader.read();
          if (chunk.done) throw new Error("Channel ended before replay completed");
          replay += new TextDecoder().decode(chunk.value);
        }
        abort.abort();
        return replay;
      } finally { clearTimeout(timer); abort.abort(); }
    };
    return { customer: await read(`/api/threads/${threadId}/stream`), inspector: await read(`/api/admin/inspector/${threadId}/stream`) };
  }, state.threadId);
  check("h11: hand-back note appears in inspector/admin only, absent from customer transcript and channel", !(await page.getByTestId("transcript").innerText()).includes(note) && !proof.customer.includes(note) && !proof.customer.includes("staff_instruction") && proof.inspector.includes(note) && proof.inspector.includes("staff_instruction"));
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
