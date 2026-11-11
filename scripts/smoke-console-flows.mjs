/**
 * Smoke flows for the consultant console (wave 3a), driven with Playwright against a real server
 * and the real model. Called from smoke-v1.mjs, which owns the browser, the customer page and `check`.
 *
 *   flowApproval    (h) a refund approval is decided in /admin: audit entry, answer pushed to the customer
 *   flowEscalation  (f) "I want a human" creates a ticket that shows up on /admin
 *   flowTakeover    (g) take over, reply, silent agent, hand back, agent answers again
 *
 * flowTakeover also rates an agent answer and checks the ratings export (i).
 *
 * Each flow takes `ctx`: { browser, page (customer), admin (console page), baseUrl, check, idle, shot,
 * docShot, TIMEOUT }. State between flows travels in `ctx.state` (e.g. the ticket id).
 */

const ticketRe = /T-\d+/;

/** Opens the console in a second tab of the same browser (PAC proxy settings carry over). */
export async function openAdmin(ctx) {
  const admin = await ctx.browser.newPage({ viewport: { width: 1500, height: 1000 } });
  await admin.goto(new URL("admin", ctx.baseUrl).href);
  await admin.getByTestId("consultant-select").waitFor();
  await admin.getByTestId("consultant-select").selectOption("Marta Nowak");
  await admin.getByText("History", { exact: true }).click();
  return admin;
}

const assistantCount = (page) => page.getByTestId("message-assistant").count();

export async function flowApproval(ctx) {
  const { page, admin, check, idle, TIMEOUT } = ctx;
  // The customer view only SHOWS the approval (read-only); the buttons live in the console.
  check("c: Agent View approval card has no Approve/Reject buttons", (await page.getByTestId("approve-button").count()) === 0);
  await admin.waitForSelector('[data-testid="console-approval-card"]', { timeout: TIMEOUT });
  check("h: approval is queued in /admin", true, await admin.getByTestId("console-approval-card").first().innerText().then((t) => JSON.stringify(t.slice(0, 80))));
  const before = await assistantCount(page);
  await ctx.docShot(admin, "admin-approval");
  await admin.getByTestId("console-approve").click();
  await admin.waitForSelector('[data-testid="audit-row"][data-decision="approved"]', { timeout: TIMEOUT });
  const audit = await admin.getByTestId("audit-row").first().innerText();
  check("h: audit entry names the consultant, shows a trace id", audit.includes("Marta Nowak") && /trace_[0-9a-f]{32}/.test(audit), JSON.stringify(audit.slice(0, 120)));
  check("h: approval left the console queue", (await admin.getByTestId("console-approval-card").count()) === 0);
  // The answer after the decision is PUSHED over the thread channel (no customer request is open).
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="message-assistant"]').length > n, before, { timeout: TIMEOUT });
  await idle();
  await page.waitForSelector('[data-testid="approval-card"][data-status="approved"]', { timeout: TIMEOUT });
  check("h: customer chat got the final answer without sending anything", (await assistantCount(page)) > before);
  check("h: Agent View shows who decided", (await page.getByTestId("approval-note").first().innerText()).includes("Marta Nowak"));
  check("h: run resumed and the refund was created", (await page.getByTestId("runner-output").innerText()).includes("REFUND_CREATED"));
  await ctx.shot("c2-approved");
}

export async function flowEscalation(ctx) {
  const { page, admin, check, idle, TIMEOUT } = ctx;
  await page.getByTestId("scenario-menu-trigger").click();
  await page.getByTestId("scenario-human-request").click();
  await page.waitForSelector('[data-testid="runner-event"][data-kind="escalation"]', { timeout: TIMEOUT });
  await idle();
  const reply = await page.getByTestId("message-assistant").last().innerText();
  const ticketId = ticketRe.exec(reply)?.[0];
  check("f: customer is told the ticket number", Boolean(ticketId), JSON.stringify(reply.slice(0, 120)));
  ctx.state.ticketId = ticketId;
  const row = admin.locator(`[data-testid="ticket-row"][data-ticket-id="${ticketId}"]`);
  await row.waitFor({ timeout: TIMEOUT });
  const text = await row.innerText();
  check("f: ticket is visible on /admin with summary and customer", text.includes("asked for a person") && text.includes("James Carter"), JSON.stringify(text.slice(0, 160)));
  const traceHref = await row.getByTestId("ticket-trace").getAttribute("href");
  const threadHref = await row.getByTestId("open-conversation").getAttribute("href");
  check("f: ticket links to the OpenAI trace and to the transcript", /trace_id=trace_[0-9a-f]{32}/.test(traceHref ?? "") && (threadHref ?? "").startsWith("#thread="), `${traceHref} ${threadHref}`);
  check("f: Agent View shows the escalation event", (await page.getByTestId("handler-ticket").innerText()).includes(ticketId));
  await ctx.shot("f-escalation");
}

export async function flowTakeover(ctx) {
  const { page, admin, check, idle, TIMEOUT } = ctx;
  await admin.locator(`[data-ticket-id="${ctx.state.ticketId}"] [data-testid="open-conversation"]`).click();
  await admin.getByTestId("conversation-pane").waitFor({ timeout: TIMEOUT });
  check("g: transcript shows the customer's message", (await admin.getByTestId("transcript").innerText()).includes("talk to a human"));

  await admin.getByTestId("take-over-button").click();
  await page.getByTestId("human-banner").waitFor({ timeout: TIMEOUT });
  check("g: customer chat shows 'A human colleague joined'", (await page.getByTestId("message-system").last().innerText()).includes("A human colleague joined"));
  check("g: Agent View shows the takeover state", (await page.getByTestId("handler-status-value").getAttribute("data-status")) === "human");

  await admin.getByTestId("reply-input").fill("Hello, this is Marta. How can I help you?");
  await admin.getByTestId("reply-send").click();
  await page.getByTestId("message-consultant").waitFor({ timeout: TIMEOUT });
  check("g: consultant reply appears in the customer chat", (await page.getByTestId("message-consultant").last().innerText()).includes("this is Marta"));

  // While taken over the agent must stay silent: the customer message goes to the consultant.
  const before = await assistantCount(page);
  await page.getByTestId("chat-input").fill("Is the Fjord sofa still in stock?");
  await page.getByTestId("send-button").click();
  await admin.waitForSelector('[data-testid="transcript-customer"]:has-text("sofa still in stock")', { timeout: TIMEOUT });
  await idle();
  await page.waitForTimeout(5000); // long enough for a wrongly started agent run to answer
  check("g: customer message reached the consultant, the agent did not answer", (await assistantCount(page)) === before);
  await ctx.docShot(admin, "admin-takeover");

  await admin.getByTestId("hand-back-button").click();
  await page.getByTestId("human-banner").waitFor({ state: "detached", timeout: TIMEOUT });
  check("g: hand back is announced and the ticket is resolved", (await page.getByTestId("message-system").last().innerText()).includes("assistant is helping you again"));
  await admin.waitForSelector(`[data-ticket-id="${ctx.state.ticketId}"][data-status="resolved"]`, { timeout: TIMEOUT });
  check("g: resolved ticket remains in History", await admin.locator(`details [data-ticket-id="${ctx.state.ticketId}"][data-status="resolved"]`).isVisible());

  await page.getByTestId("chat-input").fill("Where is my order 1004?");
  await page.getByTestId("send-button").click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="message-assistant"]').length > n, before, { timeout: TIMEOUT });
  await idle();
  check("g: after hand back the agent answers again", (await assistantCount(page)) > before, JSON.stringify((await page.getByTestId("message-assistant").last().innerText()).slice(0, 100)));
  await ctx.shot("g-takeover");

  // (i) a consultant rates the agent's answer; the export has the shape of data/scenarios.json
  await admin.waitForFunction(() => document.querySelectorAll('[data-testid="transcript-agent"]').length >= 1, null, { timeout: TIMEOUT });
  const rating = admin.getByTestId("rating-controls").last();
  await rating.getByTestId("rating-correction").fill("Answer the order question first.");
  await rating.getByTestId("rate-down").click();
  await admin.waitForSelector('[data-testid="rating-controls"][data-rating="down"]', { timeout: TIMEOUT });
  const exported = await admin.evaluate(async () => (await fetch("/api/admin/ratings/export")).json());
  const first = exported[0] ?? {};
  check(
    "i: ratings export is JSON in the scenarios.json shape",
    exported.length === 1 && first.customerId === "c-james" && typeof first.message === "string" && Array.isArray(first.expect?.replyNotMatches) && first.expectedAnswer === "Answer the order question first.",
    JSON.stringify(first).slice(0, 200),
  );
  await ctx.docShot(admin, "admin-console");
}
