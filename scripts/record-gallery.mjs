/** Record curated scenario metadata against the real app, caching complete unchanged recordings without model reruns. */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { act, settle, focusBox, viewport } from "./gallery-actions.mjs";
import { startGalleryApp } from "./gallery-app.mjs";
import { assertSafeGalleryFrame } from "./gallery-safety.mjs";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "app/package.json"));
const { chromium } = require("playwright");
const catalog = JSON.parse(readFileSync(path.join(root, "app/data/scenarios.json"), "utf8"));
const output = path.join(root, "site/data/scenarios.json");
const previous = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : [];
const rerecord = process.argv.slice(3).includes("--rerecord");
const requested = process.argv.slice(3).filter(arg => arg !== "--rerecord");
const local = process.argv[2] === "local" ? await startGalleryApp() : undefined;
const baseUrl = local?.url ?? process.argv[2];
if (!baseUrl) throw new Error("Usage: just gallery <base-url> [scenario-ids...]");
const origin = new URL(baseUrl);
if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("GalleryLocalOnly: use the app on this machine; recordings do not contact other hosts");
}
mkdirSync(path.join(root, "site/data"), { recursive: true });
mkdirSync(path.join(root, "site/frames"), { recursive: true });
const scratch = mkdtempSync(path.join(tmpdir(), "nordic-gallery-"));
let browser;

function save(record) {
  const index = previous.findIndex(item => item.id === record.id);
  if (index === -1) previous.push(record); else previous[index] = record;
  const ordered = catalog.filter(s => s.gallery).map(s => previous.find(p => p.id === s.id)).filter(Boolean);
  writeFileSync(`${output}.tmp`, JSON.stringify(ordered, null, 2) + "\n");
  renameSync(`${output}.tmp`, output);
}

async function capture(page, scenario, index, step) {
  await act(page, step);
  const focus = await focusBox(page, step.focus);
  // Check the actual page after any focus scroll and immediately before the screenshot.
  await assertSafeGalleryFrame(page);
  const png = path.join(scratch, "frame.png");
  const frame = `frames/${scenario.id}-${index + 1}.webp`;
  await page.screenshot({ path: png, animations: "disabled" });
  const converted = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", png,
    "-c:v", "libwebp", "-quality", "85", path.join(root, "site", frame)], { windowsHide: true, encoding: "utf8" });
  if (converted.status !== 0) throw new Error(`GalleryWebP: ${converted.stderr || converted.error?.message}`);
  return { caption: step.caption, icon: step.icon, frame, focus, focusSelector: step.focus,
    holdMs: step.holdMs ?? 3000, width: viewport.width, height: viewport.height };
}

async function record(scenario) {
  const source = JSON.stringify(scenario.gallery);
  const cached = previous.find(p => p.id === scenario.id);
  if (!rerecord && cached?.source === source && cached.steps.every(s => existsSync(path.join(root, "site", s.frame)))) {
    console.log(`CACHED ${scenario.id}: no model calls`); return;
  }
  if (scenario.gallery.badges.includes("AI") && !process.env.OPENAI_API_KEY) throw new Error("GalleryKeyRequired: run through scripts/with-key.mjs");
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  try {
    await page.goto(baseUrl);
    // This command owns synthetic demo resets; use `local` to avoid disturbing another app session.
    await page.getByTestId("scenario-menu-trigger").click();
    await Promise.all([page.waitForResponse("**/api/reset"), page.getByTestId("reset-demo-data").click()]);
    await page.getByTestId("customer-select").selectOption(scenario.gallery.customerId ?? "c-james");
    await settle(page);
    // Refuse an unsafe external local server before any model work, as well as before every frame.
    await assertSafeGalleryFrame(page);
    if (await page.getByTestId("visitor-key").count()) {
      // SECURITY: only the local app's password field receives the broker-injected key; never serialize it.
      await page.getByTestId("visitor-key").fill(process.env.OPENAI_API_KEY ?? "");
    }
    const steps = [];
    for (const [index, step] of scenario.gallery.steps.entries()) {
      steps.push(await capture(page, scenario, index, step));
      console.log(`RECORDED ${scenario.id} ${index + 1}/${scenario.gallery.steps.length}`);
    }
    const { title, category, lead, why, badges, icon, shows } = scenario.gallery;
    save({ id: scenario.id, title, category, lead, why, badges, icon, shows, source, steps });
  } finally { await context.close(); }
}

try {
  browser = await chromium.launch();
  for (const scenario of catalog.filter(s => s.gallery && (!requested.length || requested.includes(s.id)))) await record(scenario);
} finally { await browser?.close(); local?.close(); rmSync(scratch, { recursive: true, force: true }); }
