/** H07 rendered acceptance in the real host, using existing deterministic scenarios. */
export async function captureStart(c) {
  const { page, shot, check } = c;
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.evaluate(() => document.fonts.ready);
    const start = page.getByTestId("chat-start");
    check(`h07: ${width}px three usable starters`, await start.getByRole("button").count() === 3 && await start.getByRole("button", { name: "Asks for a human", exact: true }).isEnabled());
    const geometry = await page.evaluate(() => {
      const box = (id) => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect();
      const input = box("chat-input"), send = box("send-button"), scenarios = box("scenario-menu-trigger");
      const header = document.querySelector('[data-testid="workspace"] > header');
      const selector = document.querySelector('[data-testid="customer-select"]');
      selector.focus();
      return { aligned: [send, scenarios].every((b) => b.height === 40 && b.top === input.top), blue: getComputedStyle(header).backgroundColor, font: getComputedStyle(document.body).fontFamily, focus: getComputedStyle(selector).outlineColor, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    check(`h07: ${width}px original blue, Inter, white focus and aligned composer`, geometry.aligned && geometry.blue === "rgb(37, 99, 235)" && geometry.font.includes("Inter") && geometry.focus === "rgb(255, 255, 255)" && !geometry.overflow, JSON.stringify(geometry));
    if (width === 1024 || width === 768) {
      const header = await page.getByTestId("customer-select").evaluate((el) => ({ width: el.getBoundingClientRect().width, top: el.getBoundingClientRect().top, title: el.parentElement.querySelector("h1").getBoundingClientRect().top, reset: el.parentElement.querySelector("button").getBoundingClientRect().top }));
      check(`h08: ${width}px selector remains readable and capped`, header.width >= 190 && header.width <= 224 && Math.abs(header.reset - header.top) < 16 && (width !== 768 || Math.abs(header.top - header.title) < 12), JSON.stringify(header));
    }
    const trace = page.getByTestId("open-trace");
    check(`h07: ${width}px unavailable trace has no destination`, await trace.getAttribute("aria-disabled") === "true" && await trace.getAttribute("href") === null);
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    await shot(`chat-start-${width}`, width < 1024);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

export async function checkChat(c) {
  const { page, check } = c;
  const chat = await page.getByTestId("message-assistant").last().evaluate((el) => ({ font: getComputedStyle(el).fontSize, bg: getComputedStyle(el).backgroundColor }));
  check("h07: assistant reply is 16px plain text", chat.font === "16px" && chat.bg === "rgba(0, 0, 0, 0)");
  check("h07: running scenario is above messages", await page.getByTestId("running-scenario").evaluate((el) => el.parentElement.dataset.testid === "messages" && el === el.parentElement.firstElementChild));
  check("h07: clock is HH:mm:ss", await page.getByTestId("turn-trace").locator("time").evaluateAll((els) => els.every((el) => /^\d{2}:\d{2}:\d{2}$/.test(el.textContent))));
}

export async function checkConsultant(c) {
  const { page, check } = c;
  const reply = page.getByTestId("transcript-agent").first();
  check("h07: rule reply is labeled Agent and has rating controls", (await reply.innerText()).includes("Agent") && await reply.getByTestId("rating-controls").count() === 1);
  check("h08: correction uses readable text and handler note is rectangular", await reply.getByTestId("rating-correction").evaluate((el) => getComputedStyle(el).fontSize === "14px" && el.placeholder === "Correction (optional)") && await page.getByTestId("conversation-pane").locator("span").filter({ hasText: "the agent keeps answering" }).evaluate((el) => getComputedStyle(el).borderRadius === "6px"));
  const geometry = await page.evaluate(() => {
    const pane = document.querySelector('[data-testid="conversation-pane"]');
    const metrics = document.querySelector('[data-testid="metrics-strip"]');
    const row = (role) => document.querySelector(`[data-testid="transcript-${role}"]`).getBoundingClientRect();
    return { beforeMetrics: pane.getBoundingClientRect().top < metrics.getBoundingClientRect().top, customer: row("customer").left, agent: row("agent").right, transcript: document.querySelector('[data-testid="transcript"]').getBoundingClientRect() };
  });
  check("h07: conversation precedes metrics and staff is right-aligned", geometry.beforeMetrics && geometry.customer < geometry.agent && Math.abs(geometry.agent - geometry.transcript.right + 16) < 2);
}
