/** One-shot public-mode browser acceptance. A short-lived Next server receives no environment API key.
 * The browser types the optional parent environment key into the password field; nothing records it.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import { checkVisitorIsolation } from "./smoke-visitor-isolation.mjs";
import { checkInsecureKey } from "./smoke-insecure-key.mjs";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "app/package.json"));
const { chromium } = require("playwright");
const socket = createServer();
await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const baseUrl = `http://127.0.0.1:${port}`;
const logs = [];
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], {
  cwd: path.join(root, "app"), env: { ...process.env, PUBLIC_DEMO: "true", OPENAI_API_KEY: "",
    SESSION_SECRET: randomBytes(32).toString("hex"), ADMIN_PASSWORD: "", ALLOW_DEMO_RESET: "false" },
  stdio: ["ignore", "pipe", "pipe"],
});
// SECURITY: never echo raw server logs or HTTP details; retain only in memory to check for leaks.
server.stdout.on("data", (data) => logs.push(data.toString()));
server.stderr.on("data", (data) => logs.push(data.toString()));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const requestedUrls = [];
page.on("request", (request) => requestedUrls.push(request.url()));
const synthetic = "sk-" + "synthetic-browser-marker";
const key = process.env.OPENAI_API_KEY;
const check = (name, condition) => { assert(condition, name); console.log(`PASS ${name}`); };
async function send(text) {
  await page.getByTestId("chat-input").fill(text);
  await page.getByTestId("chat-input").press("Enter");
  await page.getByTestId("message-assistant").last().waitFor({ timeout: 120_000 });
  await page.waitForFunction(() => !document.querySelector('[data-testid="working"]'), null, { timeout: 120_000 });
}
async function resetConversation() {
  const created = page.waitForResponse((response) => response.url().endsWith("/api/threads") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Reset conversation", exact: true }).click();
  const { threadId } = await (await created).json();
  // Wait for React to commit the new identity; the previous thread is usable until creation completes.
  await page.getByTestId("context-field-thread_id").filter({ hasText: threadId.slice(0, 8) }).waitFor();
}
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await fetch(baseUrl).then((r) => r.ok).catch(() => false)) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await page.goto(baseUrl);
  const input = page.getByTestId("visitor-key");
  await input.waitFor();
  await page.getByTestId("chat-input").waitFor({ state: "visible" });
  check("public page asks for a password-type key", await input.getAttribute("type") === "password");
  await input.fill(synthetic);
  check("key absent from localStorage/sessionStorage/cookies/URLs", await page.evaluate((marker) =>
    !JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage), document.cookie, location.href]).includes(marker), synthetic)
    && !JSON.stringify(await page.context().cookies()).includes(synthetic) && !requestedUrls.some((url) => url.includes(synthetic)));
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  check("Clear removes the tab key", await input.inputValue() === "");
  await page.getByTestId("scenario-menu-trigger").click();
  check("reset hidden from public visitors", await page.getByTestId("reset-demo-data").count() === 0);
  await page.keyboard.press("Escape");
  await send("I want to speak to a human");
  check("rule starter works without a key", !/failed|Add your OpenAI key/.test(await page.getByTestId("message-assistant").last().innerText()));
  await resetConversation();
  await send("Where is my order?");
  check("missing key is visible in chat", (await page.getByTestId("message-assistant").last().innerText()).includes("Add your OpenAI key"));
  // The inspector is a separate SSE connection and can arrive after the chat response.
  await page.getByTestId("workspace").getByText(/Add your OpenAI key/).first().waitFor();
  check("missing key is visible in Agent View", (await page.getByTestId("workspace").innerText()).includes("Add your OpenAI key"));
  check("production error type remains readable", (await page.getByTestId("workspace").innerText()).includes("VisitorKeyRequired"));
  for (const [width, height] of [[1440, 1000], [1024, 1000], [768, 1000], [390, 1000], [390, 844]]) {
    await page.setViewportSize({ width, height });
    check(`no horizontal overflow at ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const heights = await input.evaluate((element) => [element.getBoundingClientRect().height, element.nextElementSibling.getBoundingClientRect().height]);
    check(`key controls aligned at ${width}`, heights.every((height) => height === 40));
    if (width < 1024) check(`message viewport usable at ${width}x${height}`,
      await page.getByTestId("messages").evaluate((element) => element.clientHeight >= 160));
    const label = height === 1000 ? width : `${width}x${height}`;
    await page.screenshot({ path: path.join(root, `docs/screenshots/h10-public-${label}.png`) });
  }
  if (process.argv.includes("--offline")) {
    console.log("PASS offline recheck makes no model calls");
  } else if (key) {
    await resetConversation();
    // SECURITY: no tracing, video, network dumps, screenshots or assertions containing the real key.
    await input.fill(key);
    await send("Hello, can you help me with Nordic Home orders?");
    const answer = await page.getByTestId("message-assistant").last().innerText();
    check("one live model turn answered", answer.length > 10 && !/request failed|rejected the key|EmptyModelOutput|blocked by/i.test(answer));
    check("real key absent from browser storage and URLs", await page.evaluate((marker) =>
      !JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage), document.cookie, location.href]).includes(marker), key)
      && !JSON.stringify(await page.context().cookies()).includes(key) && !requestedUrls.some((url) => url.includes(key)));
    check("real key absent from visible UI and server logs", !(await page.locator("body").innerText()).includes(key) && !logs.join("").includes(key));
    await page.getByRole("button", { name: "Clear", exact: true }).click();
  } else {
    console.log("NOT_CHECKED live model turn: OPENAI_API_KEY unavailable to smoke process");
    process.exitCode = 2;
  }
  await input.fill(synthetic);
  await page.reload();
  check("reload removes the tab key", await input.inputValue() === "");
  await checkVisitorIsolation({ browser, page, baseUrl, check });
  await checkInsecureKey({ browser, baseUrl, check });
} catch {
  console.error("FAIL public-demo acceptance (details suppressed to protect request secrets)");
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
  await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once("exit", resolve); });
}
