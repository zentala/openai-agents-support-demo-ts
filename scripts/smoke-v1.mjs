/**
 * Browser smoke test for the v1 app (Playwright, real browser, real model).
 * Drives the acceptance flows (a-e customer, c/h approval in the console, f escalation, g takeover, then the wave 3b flows) and
 * saves screenshots to research/v1-*.png and docs/screenshots/admin-*.png.
 * Usage: node scripts/smoke-v1.mjs [baseUrl] [--layout]
 * --layout runs only deterministic/browser checks and never calls a model.
 * --screencast records the deterministic README tour. Playwright is a project dev dependency.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { copyFile } from "node:fs/promises";
import { flowScreencast } from "./smoke-screencast.mjs";
import { flowLayout } from "./smoke-layout.mjs";
import { flowApproval, flowEscalation, flowTakeover, openAdmin } from "./smoke-console-flows.mjs";
import { flowAddress, flowClaim, flowGuest, flowSecureForm, flowStreamRefused, installProbes } from "./smoke-wave3b.mjs";

const require = createRequire(path.resolve(import.meta.dirname, "../app/package.json"));
const { chromium } = require("playwright");

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3100/";
const shots = path.resolve(import.meta.dirname, "..", "research");
const TIMEOUT = 120_000;

// PROXY_PAC: optional proxy auto-config URL, for hosts that resolve only through a local PAC file.
const browser = await chromium.launch({
  args: process.env.PROXY_PAC ? [`--proxy-pac-url=${process.env.PROXY_PAC}`] : [],
});
const recording = process.argv.includes("--screencast");
const page = await browser.newPage({ viewport: recording ? { width: 1440, height: 900 } : { width: 1500, height: 1000 }, ...(recording ? { recordVideo: { dir: path.dirname(process.env.SCREENCAST_RAW), size: { width: 1440, height: 900 } } } : {}) });
const consoleErrors = [];
const actionConflicts = [];
const expectedConflictRequests = new Map();
const collectConflict = (response) => {
  if (response.status() !== 409 || new URL(response.url()).pathname !== "/api/admin/actions") return;
  actionConflicts.push(response.json().then((body) => ({ url: response.url(), request: response.request(), body }))
    .catch(() => ({ url: response.url(), request: response.request(), body: null })));
};
page.on("response", collectConflict);
page.on("console", (m) => m.type() === "error" && consoleErrors.push({ text: m.text(), url: m.location().url }));
page.on("pageerror", (e) => consoleErrors.push({ text: `pageerror: ${e.message}`, url: "" }));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${detail}`);
};
const shot = (name) => page.screenshot({ path: path.join(shots, `v1-${name}.png`), fullPage: false });
const docShots = path.resolve(import.meta.dirname, "..", "docs", "screenshots");
const docShot = (target, name) => target.screenshot({ path: path.join(docShots, `${name}.png`), fullPage: false });
const idle = () => page.waitForFunction(() => !document.querySelector('[data-testid="working"]'), null, { timeout: TIMEOUT });
const kinds = () => page.$$eval('[data-testid="runner-event"]', (els) => els.map((e) => e.getAttribute("data-kind")));

// Shared with the console flows: the second tab is the consultant console.
const ctx = { browser, page, baseUrl, check, idle, shot, docShot, TIMEOUT, state: {}, admin: undefined, probes: installProbes(page) };
// Each intentional refusal is registered by its known UI test action, not just its HTTP status/type.
ctx.expectConflict = async (origin, errorType, click) => {
  const delivered = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/admin/actions"
    && response.request().method() === "POST" && ["reply", "take_over_and_reply"].includes(response.request().postDataJSON()?.type), { timeout: 10000 });
  await click();
  const response = await delivered;
  expectedConflictRequests.set(response.request(), { origin, errorType });
  const body = await response.json();
  check(`h11: ${origin} returns the intended typed refusal`, response.status() === 409 && body.ok === false && body.errorType === errorType);
};

try {
if (recording) {
  await flowScreencast(ctx);
} else if (process.argv.includes("--layout")) {
  await flowLayout(ctx);
} else {
await page.goto(baseUrl);
await page.getByTestId("chat-input").waitFor();
ctx.admin = await openAdmin(ctx);
ctx.admin.on("response", collectConflict);
ctx.admin.on("console", (m) => m.type() === "error" && consoleErrors.push({ text: `admin: ${m.text()}`, url: m.location().url }));
ctx.admin.on("pageerror", (e) => consoleErrors.push({ text: `admin pageerror: ${e.message}`, url: "" }));
// Refunds are kept in server memory: start every run from clean demo data.
await page.getByTestId("scenario-menu-trigger").click();
await Promise.all([page.waitForResponse("**/api/reset"), page.getByTestId("reset-demo-data").click()]);

// (a) normal question: answer + agent/handoff/tool events
await page.getByTestId("scenario-menu-trigger").click();
await page.getByTestId("scenario-iphone-signature").click();
await page.getByTestId("message-assistant").first().waitFor({ timeout: TIMEOUT });
await idle();
const a = await kinds();
const answerA = await page.getByTestId("message-assistant").first().innerText();
check("a: assistant answered", answerA.trim().length > 0, JSON.stringify(answerA.slice(0, 100)));
check("a: handoff + tool_call + tool_output + normalization + context_update in panel", ["handoff", "tool_call", "tool_output", "normalization", "context_update"].every((k) => a.includes(k)), a.join(","));
check("a: an agent card is active", (await page.locator('[data-testid^="agent-card-"][data-active="true"]').count()) === 1);
await shot("a-normal-question");

// (b) prompt injection: guardrail red with reasoning
await page.getByTestId("scenario-menu-trigger").click();
await page.getByTestId("scenario-injection-direct").click();
const jail = page.getByTestId("guardrail-jailbreak_guardrail");
await page.waitForSelector('[data-testid="guardrail-jailbreak_guardrail"][data-status="failed"]', { timeout: TIMEOUT });
await idle();
const jailText = await jail.innerText();
check("b: jailbreak guardrail is red (failed)", (await jail.getAttribute("data-status")) === "failed");
check("b: card shows reasoning", jailText.length > 60, JSON.stringify(jailText.slice(0, 160)));
check("b: chat refuses specifically", /jailbreak_guardrail/.test(await page.getByTestId("message-assistant").last().innerText()));
await shot("b-prompt-injection");

// (c) refund above threshold: the Agent View shows a READ-ONLY pending card; (h) a consultant decides in /admin
await page.getByTestId("scenario-menu-trigger").click();
await page.getByTestId("scenario-refund-over-threshold").click();
await page.waitForSelector('[data-testid="approval-card"][data-status="pending"]', { timeout: TIMEOUT });
await idle();
check("c: approval card pending", true, await page.getByTestId("approval-card").first().innerText().then((t) => JSON.stringify(t.slice(0, 80))));
await shot("c1-approval-card");
await flowApproval(ctx);

// (d) German question: KB hit from the English article
await page.getByTestId("scenario-menu-trigger").click();
await page.getByTestId("scenario-german-returns").click();
await page.waitForSelector('[data-testid="kb-hit"][data-article="returns-policy"]', { timeout: TIMEOUT });
await page.getByTestId("message-assistant").first().waitFor({ timeout: TIMEOUT });
await idle();
const answerD = await page.getByTestId("message-assistant").last().innerText();
check("d: KB hit returns-policy for the German question", true);
check("d: answer is German and cites the article", /Tage/i.test(answerD) && answerD.includes("returns-policy"), JSON.stringify(answerD.slice(0, 140)));
await shot("d-german-kb");

// (e) order picker widget + context_update: the agent shows clickable orders, a click is a structured selection
await page.getByTestId("scenario-menu-trigger").click();
await page.getByTestId("scenario-order-picker").click();
await page.getByTestId("order-picker").waitFor({ timeout: TIMEOUT });
await idle();
const choices = page.locator('[data-testid^="order-choice-"]');
check("e: order picker rendered with one real button per order", (await choices.count()) >= 3 && (await choices.first().evaluate((el) => el.tagName)) === "BUTTON", `${await choices.count()} buttons`);
check("e: picker is a labelled group (accessible)", Boolean(await page.getByTestId("order-picker").getAttribute("aria-label")));
check("e: Runner Output lists the widget event", (await kinds()).includes("widget"));
const handoffUpdated = (await kinds()).includes("context_update");
check("e: handoff hook produced a context_update before the click", handoffUpdated, (await kinds()).join(","));
await page.getByTestId("order-choice-1001").click();
await page.waitForSelector('[data-testid="context-field-active_order_id"][data-changed="true"]', { timeout: TIMEOUT });
await idle();
check("e: click put the order into the context and highlighted the field", (await page.getByTestId("context-field-active_order_id").innerText()).includes("1001"));
check("e: clicked order is pressed and the picker is now history (disabled)", (await page.getByTestId("order-choice-1001").getAttribute("aria-pressed")) === "true" && (await page.getByTestId("order-choice-1001").isDisabled()));
const updates = await page.$$eval('[data-testid="runner-event"][data-kind="context_update"]', (els) => els.map((e) => e.textContent));
check("e: context_update row shows activeOrderId -> 1001", updates.some((t) => t.includes("activeOrderId") && t.includes("1001")), JSON.stringify(updates));
check("e: assistant answered about the chosen order", /1001|chair|krzes/i.test(await page.getByTestId("message-assistant").last().innerText()));
await shot("e-order-picker");

// (f) escalation creates a ticket visible on /admin, (g) takeover and hand back
await flowEscalation(ctx);
await flowTakeover(ctx);
check("console shows no error banner", (await ctx.admin.getByTestId("console-error").count()) === 0);

// Wave 3b: credential on the channels, slot filling, secure forms, guest verification, address change.
await flowStreamRefused(ctx);
await flowClaim(ctx);
await flowSecureForm(ctx);
await flowGuest(ctx);
await flowAddress(ctx);
}

} catch (error) {
  check(`flow crashed: ${error.message.slice(0, 160)}`, false);
  await shot("failure");
  console.log("CHAT:", (await page.getByTestId("messages").innerText()).slice(-700));
  console.log("ERRORS:", await page.getByTestId("error-card").allInnerTexts());
  console.log("EVENTS:", (await kinds()).join(","));
}

check("no error cards in the panel", (await page.getByTestId("error-card").count()) === 0);
// The refusals the flows provoke on purpose (wrong credential, bad IBAN, ...) show up as "Failed to load resource" lines.
// Match intentional 409 resource messages by endpoint, parsed response type and response count.
// Unknown 409 bodies fail independently, so a known warning cannot conceal another conflict.
const conflicts = (await Promise.all(actionConflicts)).map((item) => {
  const expected = expectedConflictRequests.get(item.request);
  const body = item.body;
  return { ...item, expected: !!expected?.origin && body?.ok === false && body.errorType === expected.errorType &&
    ((expected.errorType === "StaffToneWarning" && typeof body.warningId === "string") ||
      (process.argv.includes("--layout") && expected.errorType === "SyntheticSendFailure" && body.message === "Offline smoke fixture")) };
});
const expectedCounts = new Map();
for (const item of conflicts.filter((item) => item.expected)) expectedCounts.set(item.url, (expectedCounts.get(item.url) ?? 0) + 1);
const unexpectedErrors = consoleErrors.filter(({ text, url }) => {
  if (/status of (401|403|422)/.test(text)) return false;
  const remaining = expectedCounts.get(url) ?? 0;
  if (/Failed to load resource:.*status of 409/.test(text) && remaining > 0) {
    expectedCounts.set(url, remaining - 1);
    return false;
  }
  return true;
}).map((entry) => entry.text);
unexpectedErrors.push(...conflicts.filter((item) => !item.expected).map((item) => `Unexpected HTTP 409: ${item.url}`));
check("no console errors", unexpectedErrors.length === 0, JSON.stringify(unexpectedErrors.slice(0, 3)));
const video = page.video();
// Closing the context flushes recordVideo; browser.close alone can leave a truncated WebM.
await page.context().close();
await browser.close();
if (recording && video) await copyFile(await video.path(), process.env.SCREENCAST_RAW);
process.exit(results.every((r) => r.ok) ? 0 : 1);
