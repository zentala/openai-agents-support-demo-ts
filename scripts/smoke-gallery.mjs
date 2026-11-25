/** Verify actual static gallery playback, controls, focus geometry and mobile layout with no model or external network. */
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { galleryServer } from "./gallery-static-server.mjs";
import { checkFocus, checkReviewLayout, checkShortcuts, checkResize, captureReview } from "./gallery-review-checks.mjs";
import { assertSafeGalleryFrame } from "./gallery-safety.mjs";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "app/package.json"));
const { chromium } = require("playwright");
const scenarios = JSON.parse(readFileSync(path.join(root, "site/data/scenarios.json"), "utf8"));
const server = await galleryServer();
let browser, assertions = 0;
const errors = [], failedRequests = [];
const check = (ok, message) => { if (!ok) throw new Error(`GalleryAssertion: ${message}`); assertions++; };
const shots = path.join(root, "docs/screenshots");
mkdirSync(shots, { recursive: true });

async function recordingSafety() {
  const fixture = await browser.newPage();
  try {
    await fixture.setContent('<div data-testid="public-session-secret">Demo security: SESSION_SECRET uses the public default.</div>');
    let refused = false;
    try { await assertSafeGalleryFrame(fixture); } catch (error) { refused = error.message.startsWith("GalleryUnsafeSessionSecret:"); }
    check(refused, "recorder refuses a visible public-secret notice");
    await fixture.getByTestId("public-session-secret").evaluate(el => { el.hidden = true; });
    await assertSafeGalleryFrame(fixture); check(true, "hidden notice is not in a captured frame");
    await fixture.getByTestId("public-session-secret").evaluate(el => el.remove());
    await assertSafeGalleryFrame(fixture); check(true, "private app without a notice can be recorded");
  } finally { await fixture.close(); }
}

async function iconCheck(page) {
  check(await page.locator("#play [data-play-icon]:visible svg").count() === 1, "exactly one visible playback icon");
  check(await page.locator("#play [data-play-icon]").count() === 3, "play/pause/replay remain mounted");
}

async function frameCheck(page, step) {
  await page.waitForFunction(() => { const img = document.querySelector("#frame"); return img.complete && img.naturalWidth === 1440; });
  await checkFocus(page, step, check);
  await iconCheck(page);
}

async function playback(page, scenario) {
  await page.locator(`[data-scenario="${scenario.id}"]`).click();
  check(new URL(page.url()).hash === `#${scenario.id}`, "scenario has a stable deep link");
  for (const [index, step] of scenario.steps.entries()) {
    if (index) await page.locator("#next").click();
    await frameCheck(page, step);
    check((await page.locator("#cap").innerText()).includes(step.caption), "step caption matches recording");
  }
  check(await page.locator("#next").isDisabled(), "last step disables Next");
  check(await page.locator("#play").getAttribute("aria-label") === "Replay", "manual last step offers Replay");
  await page.locator("#play").click(); await iconCheck(page);
  check((await page.locator("#cap").innerText()).startsWith("1/"), "Replay returns to first step");
  // Fast-forward the real timers through every hold; keep each intermediate frame observable.
  for (const step of scenario.steps) { await page.clock.runFor(step.holdMs + 1); await iconCheck(page); }
  check(await page.locator("#play").getAttribute("aria-label") === "Replay", "autoplay ends with Replay");
  check((await page.locator("#cap").innerText()).startsWith(`${scenario.steps.length}/`), "autoplay reaches final step");
  await page.clock.runFor(12000);
  check(await page.locator("#play").getAttribute("aria-label") === "Replay", "playback never loops");
}

async function layout(page, width) {
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px no horizontal overflow`);
  if (width === 390) {
    const player = await page.locator(".view").boundingBox(), list = await page.locator("aside").boundingBox();
    check(player.y < list.y, "mobile player comes before scenario list");
    check(player.y < 844, `mobile player starts in the first screen (top ${Math.round(player.y)}px)`);
  }
  const small = await page.locator("button:visible, select:visible, a.b:visible").evaluateAll(els => els.filter(el => {
    const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24;
  }).map(el => el.getAttribute("aria-label") || el.textContent));
  check(small.length === 0, `${width}px targets >=24px: ${small.join(", ")}`);
  await page.waitForFunction(() => [...document.querySelectorAll("svg.i use")].every(el =>
    el.closest("svg").getBoundingClientRect().width === 0 || el.getBBox().width > 0));
  const missing = await page.locator("svg.i use").evaluateAll(els => els.filter(el => el.closest("svg").getBoundingClientRect().width > 0 && el.getBBox().width === 0).length);
  check(missing === 0, "every generated sprite icon renders geometry");
}

try {
  browser = await chromium.launch();
  await recordingSafety();
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await context.route("**/*", route => new URL(route.request().url()).origin === new URL(server.url).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    page.on("response", r => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${new URL(r.url()).pathname}`); });
    await page.clock.install(); await page.goto(server.url);
    await page.locator("#loaded").waitFor({ state: "visible" });
    await layout(page, width);
    await checkReviewLayout(page, width, check);
    for (const scenario of scenarios) await playback(page, scenario);
    await page.locator('[data-scenario="human-request"]').click();
    await page.locator("#next").click(); await frameCheck(page, scenarios.find(s => s.id === "human-request").steps[1]);
    await page.screenshot({ path: path.join(shots, `h14-gallery-${width}.png`), fullPage: true, animations: "disabled" });
    await page.locator("#plain").click();
    check(await page.locator("#spotlight").isHidden(), "plain mode removes dimming and ring");
    check(await page.locator("#scene").evaluate(el => getComputedStyle(el).transform) === "none", "plain mode shows untransformed full frame");
    await page.screenshot({ path: path.join(shots, `h14-gallery-plain-${width}.png`), fullPage: false, animations: "disabled" });
    await page.locator("#plain").click();
    await page.locator('#speed [data-speed="2"]').click();
    await page.locator("#play").click(); await page.clock.runFor(1501);
    check((await page.locator("#cap").innerText()).startsWith("3/"), "2x playback respects speed");
    await page.locator("#play").click();
    await page.locator("#player").focus(); await page.keyboard.press("ArrowLeft"); await iconCheck(page);
    await checkShortcuts(page, check);
    await checkResize(page, scenarios.find(s => s.id === "human-request").steps[1], check);
    await page.locator("#prev").focus();
    check(await page.locator("#prev").evaluate(el => getComputedStyle(el).outlineStyle) !== "none", "keyboard focus is visible");
    await page.emulateMedia({ reducedMotion: "reduce" });
    check(await page.locator("#scene").evaluate(el => getComputedStyle(el).transform) === "none", "reduced motion leaves the frame untransformed");
    await page.goto(`${server.url}#guest-verify-success`); await page.reload(); await page.locator("#loaded").waitFor({ state: "visible" });
    check(await page.locator("#title").innerText() === "Verify, then ask", "deep link survives reload");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await captureReview(page, width, shots);
    await context.close();
    console.log(`PASS gallery ${width}px: all ${scenarios.length} scenarios play, stop and replay`);
  }
  check(errors.length === 0, `console/page errors: ${JSON.stringify(errors)}`);
  check(failedRequests.length === 0, `failed assets: ${JSON.stringify(failedRequests)}`);
  const result = `PASS gallery: ${assertions} assertions, 14 scenarios at 1440/390, no external requests or model calls\n`;
  console.log(result); writeFileSync(path.join(root, "research/H14-gallery-browser.txt"), result);
} finally { await browser?.close(); await server.close(); }
