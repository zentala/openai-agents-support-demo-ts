/** Small polish checks layered onto the existing no-model browser flow. */
async function paletteMatches(locator, token) {
  return locator.evaluate((el, token) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = `var(${token})`;
    document.body.append(probe);
    const matches = getComputedStyle(el).backgroundColor === getComputedStyle(probe).backgroundColor;
    probe.remove();
    return matches;
  }, token);
}

export async function checkPolishPanel({ page, check }, view) {
  if (view === "agent") {
    const chips = page.getByTestId("agents-list");
    const summary = chips.locator("summary").last();
    await summary.hover();
    check("polish: inactive agent hover is neutral with no false active agent", await paletteMatches(summary, "--color-gray-100") && await chips.locator('[data-active="true"]').count() === 0 && (await page.getByTestId("context-field-active_agent").innerText()).includes("null"));
    await page.mouse.move(1000, 20);
    const waiting = page.getByTestId("turn-trace").locator('li[data-status="waiting"] p').first();
    check("polish: waiting ticket label has no repeated status suffix", /Ticket T-\d+$/.test(await waiting.innerText()));
    const badge = page.getByTestId("handler-badge");
    check("polish: open ticket has an amber AI agent badge", await badge.innerText() === "AI agent · ticket open" && await paletteMatches(badge, "--color-amber-100"));
  }
  if (view === "consultant") {
    const heading = page.getByRole("heading", { name: /^\d+ needs? a human$/ });
    const label = await heading.innerText(), count = Number(label.split(" ")[0]);
    check("polish: human queue heading agrees with its count", label === `${count} ${count === 1 ? "needs" : "need"} a human`);
    const queue = page.getByRole("region", { name: "Needs a human" });
    check("polish: human queue has no double border or empty bottom band", await queue.evaluate((el) => getComputedStyle(el).borderTopWidth === "0px" && getComputedStyle(el).paddingBottom === "0px" && getComputedStyle(el.querySelector('[data-testid="ticket-queue"]')).marginBottom === "0px"));
    const notice = page.getByTestId("unprotected-banner");
    check("polish: security notice is neutral with a warning icon", await paletteMatches(notice, "--color-gray-50") && await notice.locator("svg").count() === 1);
  }
  if (view === "how") {
    const model = page.locator("[data-layer-tag]").filter({ hasText: "AI model" });
    const code = page.locator("[data-layer-tag]").filter({ hasText: "Code" });
    check("polish: AI model and Code tags use distinct tints", await model.count() === 2 && await code.count() === 6 && await paletteMatches(model.first(), "--color-blue-100") && await paletteMatches(code.first(), "--color-gray-100"));
  }
}

export async function checkMenuHints({ page, check, shot }, width) {
  const scroll = page.getByTestId("scenario-scroll");
  const firstLabel = scroll.getByRole("group").first().locator(":scope > div").first();
  check(`polish: ${width}px first scenario group has no divider`, await firstLabel.evaluate((el) => getComputedStyle(el).borderTopWidth === "0px"));
  check(`polish: ${width}px menu initially hints only downward scrolling`, await page.getByTestId("scenario-scroll-top").count() === 0 && await page.getByTestId("scenario-scroll-bottom").count() === 1);
  await scroll.evaluate((el) => { el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; });
  await page.waitForFunction(() => document.querySelector('[data-testid="scenario-scroll-top"]') && document.querySelector('[data-testid="scenario-scroll-bottom"]'));
  const hints = page.locator('[data-testid="scenario-scroll-top"], [data-testid="scenario-scroll-bottom"]');
  check(`polish: ${width}px menu middle shows both non-blocking gradient hints`, await hints.evaluateAll((els) => els.length === 2 && els.every((el) => getComputedStyle(el).pointerEvents === "none" && getComputedStyle(el).backgroundImage !== "none")));
  await shot(`scenario-menu-middle-${width}`);
  await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  // React updates the edge hints after the browser dispatches the scroll event.
  await page.getByTestId("scenario-scroll-bottom").waitFor({ state: "detached" });
  check(`polish: ${width}px menu bottom removes the downward gradient`, await page.getByTestId("scenario-scroll-bottom").count() === 0 && await page.getByTestId("scenario-scroll-top").count() === 1);
}

export async function captureRunner({ page, select, check, shot }) {
  await page.setViewportSize({ width: 768, height: 844 });
  await select("Agent", "agent");
  await page.getByTestId("runner-output").scrollIntoViewIfNeeded();
  check("polish: Runner Output remains readable at 768px", await page.getByTestId("runner-summary").evaluateAll((rows) => rows.length > 0 && rows.every((el) => getComputedStyle(el).whiteSpace !== "nowrap" && el.scrollWidth <= el.clientWidth)));
  await page.mouse.move(0, 0);
  await shot("runner-768");
}

export async function checkHistoryHierarchy({ page, check }) {
  const history = page.locator("details").filter({ has: page.locator("summary", { hasText: "History" }) });
  const sizes = await history.evaluate((el) => ({ title: parseFloat(getComputedStyle(el.querySelector("summary")).fontSize), nested: [...el.querySelectorAll("h3 button")].map((heading) => parseFloat(getComputedStyle(heading).fontSize)) }));
  check("polish: History shares section styling above smaller nested headings", sizes.title === 16 && sizes.nested.length === 2 && sizes.nested.every((size) => size < sizes.title) && await history.locator("summary svg").count() === 2);
}

export async function checkReEscalation({ page, check, state }) {
  const nextId = await page.evaluate(async (threadId) => {
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId, messages: [{ role: "user", parts: [{ type: "text", text: "I would like to talk to a human, please." }] }] }) });
    await response.text();
    const state = await fetch("/api/admin/state").then((r) => r.json());
    return state.tickets.find((t) => t.threadId === threadId && t.status === "open")?.id;
  }, state.threadId);
  await page.locator(`[data-ticket-id="${nextId}"][data-status="open"]`).getByTestId("open-conversation").click();
  await page.waitForFunction((id) => document.querySelector('[data-testid="conversation-ticket"]')?.textContent === `Ticket ${id}`, nextId);
  check("polish: re-escalation header chooses the new open ticket", Boolean(nextId) && nextId !== state.ticketId && await page.getByTestId("conversation-ticket").innerText() === `Ticket ${nextId}`);
  await page.getByTestId("reply-input").fill("Hello, I can help with this request.");
  await page.getByTestId("reply-send").click();
  await page.locator('[data-testid="conversation-pane"][data-handler="human"]').waitFor();
  await page.getByTestId("hand-back-button").click();
  await page.locator(`details [data-ticket-id="${nextId}"][data-status="resolved"]`).waitFor();
  check("polish: resolved conversation header keeps the newest ticket", await page.getByTestId("conversation-ticket").innerText() === `Ticket ${nextId}`);
}
