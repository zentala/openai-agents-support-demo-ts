/** H07 rendered acceptance in the real host, using existing deterministic scenarios. */
export async function captureStart(c) {
  const { page, shot, check } = c;
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.evaluate(() => document.fonts.ready);
    const start = page.getByTestId("chat-start");
    const highlights = start.getByTestId("start-highlights");
    check(`h07: ${width}px three usable starters`, await highlights.getByRole("button").count() === 3 && await highlights.getByTestId("start-highlight-human-request").isEnabled());
    const geometry = await page.evaluate(() => {
      const box = (id) => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect();
      const input = box("chat-input"), send = box("send-button"), scenarios = box("scenario-menu-trigger");
      const header = document.querySelector('[data-testid="workspace"] > header');
      const selector = document.querySelector('[data-testid="customer-select"]');
      const chevron = selector.parentElement.querySelector("svg");
      selector.focus();
      return { aligned: [send, scenarios].every((b) => b.height === 40 && b.top === input.top), blue: getComputedStyle(header).backgroundColor, font: getComputedStyle(document.body).fontFamily, focus: getComputedStyle(selector).outlineColor, overflow: document.documentElement.scrollWidth > innerWidth,
        chevronInset: chevron ? selector.getBoundingClientRect().right - chevron.getBoundingClientRect().right : null,
        chevronPassThrough: chevron && getComputedStyle(chevron).pointerEvents === "none", selectorHeight: selector.getBoundingClientRect().height };
    });
    check(`h07: ${width}px original blue, Inter, white focus and aligned composer`, geometry.aligned && geometry.blue === "rgb(37, 99, 235)" && geometry.font.includes("Inter") && geometry.focus === "rgb(255, 255, 255)" && !geometry.overflow, JSON.stringify(geometry));
    check(`h11: ${width}px selector chevron is inset and click-through with 40px native control`, geometry.chevronInset !== null && Math.abs(geometry.chevronInset - 12) < 1 && geometry.chevronPassThrough && geometry.selectorHeight === 40);
    if (width === 1024 || width === 768) {
      const header = await page.getByTestId("customer-select").evaluate((el) => {
        const container = el.closest('[data-testid="customer-header"]');
        return { width: el.getBoundingClientRect().width, top: el.getBoundingClientRect().top, title: container.querySelector("h1").getBoundingClientRect().top, reset: container.querySelector("button").getBoundingClientRect().top };
      });
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
  const chat = page.getByTestId("message-automatic").last();
  check("h12: rule reply is a centered automatic receipt without AI attribution", await chat.getAttribute("data-message-kind") === "system" && !(await chat.innerText()).includes("AI assistant"));
  check("h07: running scenario is above messages", await page.getByTestId("running-scenario").evaluate((el) => el.parentElement.dataset.testid === "messages" && el === el.parentElement.firstElementChild));
  check("h07: clock is HH:mm:ss", await page.getByTestId("turn-trace").locator("time").evaluateAll((els) => els.every((el) => /^\d{2}:\d{2}:\d{2}$/.test(el.textContent))));
}

export async function checkConsultant(c) {
  const { page, check } = c;
  const reply = page.getByTestId("transcript-system").filter({ has: page.getByTestId("message-automatic") }).first();
  check("h12: console shares automatic kind and never rates fixed code as an AI answer", (await reply.innerText()).includes("Automatic step") && await reply.getByTestId("rating-controls").count() === 0);
  check("h08: handler note is rectangular", await page.getByTestId("conversation-pane").locator("span").filter({ hasText: "the agent keeps answering" }).evaluate((el) => getComputedStyle(el).borderRadius === "6px"));
  const geometry = await page.evaluate(() => {
    const pane = document.querySelector('[data-testid="conversation-pane"]');
    const metrics = document.querySelector('[data-testid="metrics-strip"]');
    const receipt = pane.querySelector('[data-testid="message-automatic"]').getBoundingClientRect();
    return { beforeMetrics: pane.getBoundingClientRect().top < metrics.getBoundingClientRect().top, receipt, transcript: document.querySelector('[data-testid="transcript"]').getBoundingClientRect() };
  });
  check("h12: conversation precedes metrics and automatic receipt fits its transcript", geometry.beforeMetrics && geometry.receipt.left >= geometry.transcript.left && geometry.receipt.right <= geometry.transcript.right);
}
