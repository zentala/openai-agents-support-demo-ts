/** No-model acceptance against the production host. HTTP fixtures are labeled separately. */
import { captureStart, checkChat, checkConsultant } from "./smoke-design-h07.mjs";
import { checkAnnotations } from "./smoke-annotations.mjs";
import path from "node:path";
import { checkTypography } from "./smoke-typography.mjs";
import { prepareOverview, captureScenarioMenu, rememberEscalation, checkSelectedTicket, captureReviewFrames, checkResolution, checkRejectedMetrics } from "./smoke-review-fixes.mjs";
import { checkPolishPanel, captureRunner, checkReEscalation, checkHistoryHierarchy } from "./smoke-polish.mjs";
import { checkScenarioFollowUps } from "./smoke-scenario-followups.mjs";
import { checkH11Captures } from "./smoke-h11-captures.mjs";
import { checkMessageKinds } from "./smoke-message-kinds.mjs";

function controls(ctx) {
  const { page } = ctx;
  const tabs = page.getByRole("tablist", { name: "Demo workspace" });
  const tab = (name) => tabs.getByRole("tab", { name: name === "Consultant" ? /^Consultant/ : name, exact: name !== "Consultant" });
  const select = async (name, value) => {
    const target = tab(name);
    // The default Agent tab is active without a query; selecting it again emits no navigation.
    if (await target.getAttribute("aria-selected") !== "true") {
      await target.click();
      await page.waitForURL((url) => url.searchParams.get("tab") === value);
    }
    await target.and(page.locator('[aria-selected="true"]')).waitFor({ state: "visible" });
    const panelId = await target.getAttribute("aria-controls");
    if (!panelId) throw new Error(`Workspace tab ${name} has no associated panel`);
    await page.locator(`[role="tabpanel"][id=${JSON.stringify(panelId)}]`).waitFor({ state: "visible" });
  };
  const shot = (name, fullPage = false) => page.screenshot({ path: path.resolve("docs/screenshots", `h08-${name}.png`), fullPage });
  return { ...ctx, tab, select, shot };
}

async function navigation({ page, tab, select, baseUrl, check }) {
  check("layout: page and default Agent tab render", await tab("Agent").getAttribute("aria-selected") === "true");
  await tab("Agent").focus();
  for (const [key, name, value] of [["ArrowRight", "Consultant", "consultant"], ["ArrowLeft", "Agent", "agent"], ["End", "How it works", "how"], ["Home", "Agent", "agent"]]) {
    await page.keyboard.press(key);
    await page.waitForURL((url) => url.searchParams.get("tab") === value);
    check(`layout: ${key} activates ${name}`, await tab(name).getAttribute("aria-selected") === "true");
  }
  await select("How it works", "how");
  check("layout: eight pipeline layers and Try it actions", await page.getByRole("list", { name: "Support pipeline" }).locator(":scope > li").count() === 8 && await page.getByRole("list", { name: "Support pipeline" }).locator("li button").count() === 14);
  check("layout: README security link", await page.locator('a[href="/readme#security"]').count() === 1);
  const readme = await page.request.get(new URL("/readme", baseUrl).href);
  check("layout: README security document loads", readme.ok() && (await readme.text()).includes("Rules enforced in code"));
  await page.goBack();
  await page.waitForURL((url) => url.searchParams.get("tab") === "agent");
  check("layout: browser Back restores Agent", await tab("Agent").getAttribute("aria-selected") === "true");
  await select("Agent", "agent");
}

async function menuAndRun({ page, tab, check, shot }) {
  await page.getByTestId("scenario-menu-trigger").click();
  for (const category of ["Orders", "Knowledge", "Languages", "Address changes", "Security & guardrails", "Refunds & approvals", "Human handoff", "Data collection", "Guest mode"]) {
    check(`layout: scenario group ${category}`, await page.getByRole("group", { name: category, exact: true }).count() === 1);
  }
  check("layout: seeded scenarios hidden", await page.getByTestId("scenario-refund-already-refunded").count() === 0 && await page.getByTestId("scenario-cod-refund-with-iban").count() === 0);
  check("layout: reset is in menu", await page.getByTestId("reset-demo-data").count() === 1);
  await shot("scenario-menu-1440");
  await page.keyboard.press("Escape");
  // Radix restores focus after its closing frame; an immediate DOM read races that lifecycle.
  await page.waitForFunction(() => document.activeElement === document.querySelector('[data-testid="scenario-menu-trigger"]'), null, { timeout: 3000 });
  check("layout: menu returns keyboard focus", await page.getByTestId("scenario-menu-trigger").evaluate((el) => el === document.activeElement));
  await page.keyboard.press("Enter");
  await page.getByRole("menu", { name: "Scenarios" }).waitFor();
  await page.keyboard.press("ArrowDown");
  check("layout: menu supports keyboard entry and item focus", await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem"));
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.activeElement === document.querySelector('[data-testid="scenario-menu-trigger"]'));
  const before = Number(await page.getByTestId("consultant-badge").innerText());
  // This request bypasses guardrail/model execution in turn.ts: real deterministic rule, no API credits.
  await page.getByTestId("scenario-menu-trigger").click();
  await page.getByTestId("scenario-human-request").click();
  await page.getByTestId("message-automatic").last().waitFor();
  await page.waitForFunction((n) => Number(document.querySelector('[data-testid="consultant-badge"]')?.textContent) > n, before);
  check("layout: selected scenario chip", (await page.getByTestId("running-scenario").innerText()).includes("Talk to a person"));
  check("layout: badge increases amber without switching tabs", await page.getByTestId("consultant-badge").getAttribute("data-unseen") === "true" && await tab("Agent").getAttribute("aria-selected") === "true");
  check("layout: current turn explains skipped model", (await page.getByTestId("turn-trace").innerText()).includes("model skipped"));
}

async function screenshots(c) {
  const { page, select, check, shot } = c;
  const views = [["Agent", "agent"], ["Consultant", "consultant"], ["How it works", "how"]];
  for (const [name, value] of views) {
    await select(name, value);
    await prepareOverview(c, value);
    await checkPolishPanel(c, value);
    await checkTypography(page, check, `${value} desktop`);
    await shot(`${value}-1440`);
    if (value === "consultant") {
      await page.locator(`[data-ticket-id="${c.state.ticketId}"]`).getByTestId("open-conversation").click();
      await page.getByTestId("conversation-pane").waitFor();
      await checkSelectedTicket(c);
      await checkConsultant(c);
      check("layout: selected conversation opens below the queue", await page.getByTestId("transcript-customer").count() > 0);
      await page.getByTestId("conversation-pane").scrollIntoViewIfNeeded();
      await shot("consultant-conversation-1440");
    }
  }
  check("layout: opening Consultant acknowledges badge", await page.getByTestId("consultant-badge").getAttribute("data-unseen") === "false");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, value] of views) {
    await select(name, value);
    await checkTypography(page, check, `${value} mobile`);
    check(`layout: ${value} has no mobile horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await shot(`${value}-390`, true);
  }
  const boxes = await page.evaluate(() => ({ chat: document.querySelector('[data-testid="customer-view"]').getBoundingClientRect().top, panel: document.querySelector('[data-testid="workspace"]').getBoundingClientRect().top }));
  check("layout: mobile chat precedes workspace", boxes.chat < boxes.panel);
  await select("Agent", "agent");
  check("layout: narrow runner summaries wrap instead of ellipsis", await page.getByTestId("runner-summary").evaluateAll((rows) => rows.length > 0 && rows.every((row) => getComputedStyle(row).whiteSpace !== "nowrap" && getComputedStyle(row).textOverflow !== "ellipsis")));
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot("stacked-390");
  const geometry = await page.evaluate(() => {
    const input = document.querySelector('[data-testid="chat-input"]').getBoundingClientRect();
    const send = document.querySelector('[data-testid="send-button"]').getBoundingClientRect();
    return input.height === send.height && input.top === send.top;
  });
  check("layout: composer controls have aligned equal heights", geometry);
}

async function authAndRedirect({ page, tab, baseUrl, check, shot }) {
  await page.setViewportSize({ width: 390, height: 844 });
  const redirected = await page.request.get(new URL("/admin", baseUrl).href, { maxRedirects: 0 });
  check("layout: legacy admin HTTP redirect", redirected.status() === 307 && redirected.headers().location === "/?tab=consultant");
  await page.goto(new URL("/admin", baseUrl).href);
  await page.waitForURL((url) => url.searchParams.get("tab") === "consultant");
  check("layout: redirect opens Consultant tab", await tab("Consultant").getAttribute("aria-selected") === "true");
  // Test the real notice renderer with a synthetic plain-text proxy 401, without changing the password.
  await page.route("**/api/admin/state", (route) => route.fulfill({ status: 401, contentType: "text/plain", body: "Authentication required" }));
  await page.getByTestId("console-error").waitFor({ timeout: 10000 });
  check("layout: synthetic 401 notice explains password", (await page.getByTestId("console-error").innerText()).includes("Your browser will ask for the password"));
  check("h08: 401 hides unprotected label and Retry uses secondary styling", await page.getByTestId("consultant-panel").locator(":scope > div").first().innerText().then((text) => !text.includes("Unprotected demo")) && await page.getByRole("button", { name: "Retry", exact: true }).evaluate((el) => getComputedStyle(el).backgroundColor === "rgb(255, 255, 255)" && getComputedStyle(el).color !== getComputedStyle(el.parentElement).color));
  await shot("password-notice-390", true);
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  const [refused] = await Promise.all([page.waitForResponse((r) => r.url().endsWith("/api/admin/state") && r.status() === 401), retry.click()]);
  check("layout: Retry issues a new request and preserves the refusal notice", refused.status() === 401 && await page.getByTestId("console-error").isVisible() && (await retry.boundingBox()).height >= 40);
  await page.unroute("**/api/admin/state");
  const [recovered] = await Promise.all([page.waitForResponse((r) => r.url().endsWith("/api/admin/state") && r.status() === 200), retry.click()]);
  const state = await recovered.json();
  await page.getByTestId("console-error").waitFor({ state: "detached" });
  check("layout: retry recovers real console data", recovered.ok() && Array.isArray(state.tickets) && state.consultants.includes(await page.getByTestId("consultant-select").inputValue()) && await page.getByTestId("metrics-strip").isVisible());
}

export async function flowLayout(ctx) {
  const c = controls(ctx);
  await c.page.setViewportSize({ width: 1440, height: 900 });
  await c.page.goto(c.baseUrl);
  await c.page.getByTestId("chat-input").waitFor();
  await c.page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);
  await c.page.waitForFunction(() => /^\d+$/.test(document.querySelector('[data-testid="consultant-badge"]')?.textContent ?? ""));
  c.check("layout: initial queue load has no amber attention", await c.page.getByTestId("consultant-badge").getAttribute("data-unseen") === "false");
  await captureStart(c);
  await checkMessageKinds(c);
  await checkStartReachability(c);
  await checkScenarioFollowUps(c);
  await checkH11Captures(c);
  await navigation(c);
  await captureScenarioMenu(c, 1440);
  await menuAndRun(c);
  await rememberEscalation(c);
  await checkChat(c);
  await screenshots(c);
  await captureReviewFrames(c);
  await captureRunner(c);
  await authAndRedirect(c);
  await checkResolution(c);
  await checkHistoryHierarchy(c);
  await checkReEscalation(c);
  await checkRejectedMetrics(c);
  await checkAnnotations(c);
  console.log("NOT_CHECKED  Model-dependent chat, approvals/resume, KB, guest verification, claims and address flows are outside --layout scope.");
}

/** UI transport fixture only: real start clicks create real cookie-scoped threads, with no model request. */
async function checkStartReachability({ page, baseUrl, check }) {
  const viewport = page.viewportSize();
  const fixture = (route) => {
    const chunks = [{ type: "start", messageId: "c6-fixture" }, { type: "text-start", id: "c6-text" },
      { type: "text-delta", id: "c6-text", delta: "Synthetic UI transport fixture. No model ran." }, { type: "text-end", id: "c6-text" }, { type: "finish" }];
    return route.fulfill({ contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n" });
  };
  await page.route("**/api/chat", fixture);
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      for (const [id, customerId] of [["address-change-confirm", "c-james"], ["address-delivered-refused", "c-anna"], ["guest-verify-success", "guest"]]) {
        await page.goto(baseUrl);
        await page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);
        if (id === "address-change-confirm") await page.screenshot({ path: path.resolve("docs/screenshots", `h11-c-start-${width}.png`) });
        const button = page.getByTestId("start-scenario-list").getByTestId(`start-scenario-${id}`);
        await button.scrollIntoViewIfNeeded();
        check(`h11: ${width}px ${id} reachable on start without menu`, await button.isVisible() && await button.isEnabled() && await page.getByRole("menu", { name: "Scenarios", exact: true }).count() === 0);
        const label = await button.innerText();
        const sent = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/chat" && request.method() === "POST", { timeout: 10000 });
        await button.click();
        const threadId = (await sent).postDataJSON().threadId;
        await page.getByTestId("message-assistant").filter({ hasText: "Synthetic UI transport fixture" }).waitFor({ timeout: 10000 });
        const view = await page.evaluate(async (id) => {
          const response = await fetch(`/api/admin/threads/${encodeURIComponent(id)}`);
          if (!response.ok) throw new Error(`Own thread read: HTTP ${response.status}`);
          return response.json();
        }, threadId);
        check(`h11: ${width}px ${id} selects its real server-owned customer`, view.threadId === threadId && view.customerId === customerId && await page.getByTestId("customer-select").inputValue() === customerId && (await page.getByTestId("running-scenario").innerText()).includes(label));
        if (customerId === "guest") check(`h11: ${width}px guest starter stays unverified before model/verification`, view.customerOrder.status === "unverified" && !view.customerOrder.customer && !view.customerOrder.order);
      }
    }
  } finally {
    await page.unroute("**/api/chat", fixture);
    await page.setViewportSize(viewport);
    await page.goto(baseUrl);
    await page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);
  }
}
