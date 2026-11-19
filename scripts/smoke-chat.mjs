/**
 * Smoke test for the demo UI: opens the page, types one message into the
 * ChatKit composer (it lives inside an iframe), waits for the agent's reply
 * and saves a screenshot. Usage: node smoke-chat.mjs [url] [message] [screenshot]
 */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:3000/";
const message = process.argv[3] ?? "What's the status of flight FLT-123?";
const screenshot = process.argv[4] ?? "smoke.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));

await page.goto(url);
// ChatKit renders the chat inside an iframe, so we must enter that frame first.
const chat = page.frameLocator("iframe").first();
const composer = chat.getByRole("textbox").first();
await composer.fill(message);
await composer.press("Enter");

// The Runner Output panel lists events once the agent run produces them.
await page.waitForFunction(() => !document.body.innerText.includes("No runner events yet"), null, {
  timeout: 90_000,
});
await page.waitForTimeout(8_000); // let the streamed answer finish
await page.screenshot({ path: screenshot, fullPage: true });

const chatText = await chat.locator("body").innerText();
console.log("CHAT:\n" + chatText.slice(-800));
console.log("CONSOLE ERRORS:", consoleErrors.length ? consoleErrors : "none");
await browser.close();
