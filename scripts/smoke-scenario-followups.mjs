/** Existing layout smoke extension: labelled synthetic chat transport, real UI/thread creation, zero model calls. */
import { readFileSync } from "node:fs";

const scenario = JSON.parse(readFileSync(new URL("../app/data/scenarios.json", import.meta.url), "utf8"))
  .find((entry) => entry.id === "claim-slot-filling");
const expandDate = (text) => text.replaceAll("{{today}}", new Date().toISOString().slice(0, 10));
const inputValue = (page, expected) => page.waitForFunction((text) => document.querySelector('[data-testid="chat-input"]')?.value === text, expected, { timeout: 5000 });

function chatFixture() {
  const requests = [];
  const handler = (route) => {
    requests.push(route.request());
    const id = `d4-fixture-${requests.length}`;
    const chunks = [{ type: "start", messageId: id }, { type: "text-start", id },
      { type: "text-delta", id, delta: "Synthetic UI transport fixture. No model ran." }, { type: "text-end", id }, { type: "finish" }];
    return route.fulfill({ contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n" });
  };
  return { requests, handler };
}

/** Exact request identity avoids the polling-response race already corrected in the consultant smoke. */
async function sendAndFinish(page, action) {
  const sent = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/chat" && request.method() === "POST", { timeout: 10000 });
  await action();
  const request = await sent;
  const response = await request.response();
  if (!response) throw new Error("Synthetic chat response was not delivered");
  await response.finished();
  return request;
}

async function checkAtWidth({ page, baseUrl, check, docShot }, fixture, width, motion) {
  fixture.requests.length = 0;
  await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);
  const starter = page.getByTestId(`start-scenario-${scenario.id}`);
  await starter.scrollIntoViewIfNeeded();
  const first = await sendAndFinish(page, () => starter.click());
  const threadId = first.postDataJSON().threadId;
  await inputValue(page, expandDate(scenario.followUps[0]));
  check(`h11: ${width}px next scenario message is a draft at Step 2 of 4`, (await page.getByTestId("running-scenario").innerText()).includes("Step 2 of 4"));
  // Beyond the documented 600ms animation bound: no follow-up may send itself.
  await page.waitForTimeout(700);
  check(`h11: ${width}px suggested follow-up never auto-sends`, fixture.requests.length === 1 && fixture.requests[0] === first);
  await docShot(page, motion === "reduce" ? `h11-d-suggestion-${width}` : `h11-d-suggestion-motion-${width}`);
  const edited = "The left door has a crack; this is my edited damage description.";
  await page.getByTestId("chat-input").fill(edited);
  await page.waitForTimeout(700);
  check(`h11: ${width}px manual edit survives suggestion typing`, await page.getByTestId("chat-input").inputValue() === edited && fixture.requests.length === 1);
  const second = await sendAndFinish(page, () => page.getByTestId("send-button").click());
  const body = second.postDataJSON();
  const text = body.messages.filter((message) => message.role === "user").at(-1).parts.filter((part) => part.type === "text").map((part) => part.text).join("\n");
  check(`h11: ${width}px Send delivers the exact edited text in the same thread`, text === edited && body.threadId === threadId);
  await inputValue(page, expandDate(scenario.followUps[1]));
  check(`h11: ${width}px explicit Send advances to Step 3 of 4`, fixture.requests.length === 2 && (await page.getByTestId("running-scenario").innerText()).includes("Step 3 of 4"));
  if (motion === "no-preference") await checkAnimatedEdit({ page, check }, fixture, width);
  await page.getByTestId("chat-input").fill("Unsent draft for the old customer");
  await page.getByTestId("customer-select").selectOption("c-james");
  await page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);
  await inputValue(page, "");
  check(`h11: ${width}px ${motion} switching customer clears old scenario and draft`, await page.getByTestId("running-scenario").count() === 0 && fixture.requests.length === (motion === "reduce" ? 2 : 3));
}

async function checkAnimatedEdit({ page, check }, fixture, width) {
  await sendAndFinish(page, () => page.getByTestId("send-button").click());
  const expected = expandDate(scenario.followUps[2]);
  await page.waitForFunction((full) => {
    const value = document.querySelector('[data-testid="chat-input"]')?.value;
    return value && full.startsWith(value) && value.length < full.length;
  }, expected, { timeout: 5000 });
  const edited = "Keep my manual edit instead of the animated suggestion.";
  await page.getByTestId("chat-input").fill(edited);
  await page.waitForTimeout(700);
  check(`h11: ${width}px normal-motion typing stops on an edit without auto-send`, await page.getByTestId("chat-input").inputValue() === edited && fixture.requests.length === 3);
}

export async function checkScenarioFollowUps(c) {
  const viewport = c.page.viewportSize();
  const fixture = chatFixture();
  await c.page.route("**/api/chat", fixture.handler);
  try {
    await c.page.emulateMedia({ reducedMotion: "no-preference" });
    await checkAtWidth(c, fixture, 1440, "no-preference");
    await c.page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [1440, 390]) await checkAtWidth(c, fixture, width, "reduce");
  } finally {
    await c.page.unroute("**/api/chat", fixture.handler);
    await c.page.emulateMedia({ reducedMotion: null });
    await c.page.setViewportSize(viewport);
    await c.page.goto(c.baseUrl);
    await c.page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);
  }
}
