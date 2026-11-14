/** Actual-host author labels: real rule and consultant producers, then an explicitly synthetic AI display fixture. */
const ready = (page) => page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);

async function send(page, text) {
  await page.getByTestId("chat-input").fill(text);
  const delivered = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/chat" && response.request().method() === "POST", { timeout: 10000 });
  await page.getByTestId("send-button").click();
  const response = await delivered;
  if (!response.ok()) throw new Error(`Message-kind chat: HTTP ${response.status()}`);
  await response.finished();
}

async function staff(page, threadId, type, text) {
  await page.evaluate(async (body) => {
    const response = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(`${body.type}: ${result.errorType}: ${result.message}`);
  }, { type, threadId, consultant: "Marta Nowak", ...(text ? { text } : {}) });
}

function aiFixture(route) {
  const id = "h12-ai-display";
  const text = "Synthetic AI display fixture; no model ran. Returns are accepted within 30 days [returns-policy].";
  const chunks = [{ type: "start", messageId: id }, { type: "data-messages", data: [{ text, sender: { kind: "ai" } }] },
    { type: "text-start", id }, { type: "text-delta", id, delta: text }, { type: "text-end", id }, { type: "finish" }];
  return route.fulfill({ contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" },
    body: chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n" });
}

async function frames(c, width) {
  const { page, baseUrl, check, docShot } = c;
  await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
  const created = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/threads" && response.request().method() === "POST", { timeout: 10000 });
  await page.goto(baseUrl);
  const { threadId } = await (await created).json();
  await ready(page);
  await send(page, "I would like to speak to a human, please.");
  const receipt = page.getByTestId("message-automatic");
  await receipt.waitFor();
  check(`h12: ${width}px real rule is an automatic ticket receipt, never an AI answer`, (await receipt.innerText()).includes("Passed to a human")
    && await receipt.getByTestId("message-ticket").count() === 1 && await page.getByTestId("message-assistant").count() === 0);
  await receipt.scrollIntoViewIfNeeded();
  const card = await receipt.evaluate((element) => {
    const rect = (target) => { const { top, bottom, left, right } = target.getBoundingClientRect(); return { top, bottom, left, right }; };
    const [icon, row, sentence] = element.children;
    return { card: rect(element), row: rect(row), sentence: rect(sentence), parts: [...row.children].map(rect), icon: rect(icon) };
  });
  const cardGeometry = JSON.stringify({ width, cardWidth: Math.round(card.card.right - card.card.left), cardHeight: Math.round(card.card.bottom - card.card.top), titleRowHeight: Math.round(card.row.bottom - card.row.top) });
  const inside = [...card.parts, card.sentence].every((part) => part.left >= card.card.left && part.right <= card.card.right);
  check(`h12: ${width}px automatic card parts stay inside the card`, inside, cardGeometry);
  // Title, ticket badge and "Automatic step" badge share one line when the panel is wide; the sentence is line 2.
  if (width >= 768) check(`h12: ${width}px automatic card has title, ticket and badge on one line, sentence on the next`,
    card.parts.length === 3 && Math.max(...card.parts.map((part) => part.top)) - Math.min(...card.parts.map((part) => part.top)) < 2 && card.sentence.top >= card.row.bottom - 1, cardGeometry);
  await docShot(page, `h12-automatic-${width}`);
  await staff(page, threadId, "take_over_and_reply", "Hi, I am here to help with your order.");
  await page.getByTestId("message-consultant").waitFor();
  check(`h12: ${width}px real human has a named label and a thin join notice`, await page.getByText("Marta Nowak · human", { exact: true }).count() === 1 && await page.getByTestId("message-system").count() > 0);
  await page.getByTestId("message-consultant").scrollIntoViewIfNeeded();
  await docShot(page, `h12-human-${width}`);
  await staff(page, threadId, "hand_back");
  await page.getByTestId("human-banner").waitFor({ state: "detached" });
  await page.route("**/api/chat", aiFixture);
  try {
    await send(page, "Show the labelled synthetic AI and citation display.");
    await page.getByTestId("message-assistant").waitFor();
    const chip = page.getByTestId("messages").getByTestId("source-chip").last();
    await chip.scrollIntoViewIfNeeded();
    await chip.focus();
    check(`h12: ${width}px synthetic model answer has AI label and a BookOpen citation`, await page.getByText("AI assistant", { exact: true }).count() === 1 && await chip.locator("svg.lucide-book-open").count() === 1);
    check(`h12: ${width}px author surfaces have no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await docShot(page, `h12-ai-citation-${width}`);
    await chip.click();
    await page.getByTestId("kb-article-dialog").waitFor();
    await page.keyboard.press("Escape");
    check(`h12: ${width}px citation Escape restores keyboard focus`, await chip.evaluate((element) => document.activeElement === element));
  } finally { await page.unroute("**/api/chat", aiFixture); }
}

export async function checkMessageKinds(c) {
  const viewport = c.page.viewportSize();
  try { for (const width of [1440, 390]) await frames(c, width); }
  finally { await c.page.setViewportSize(viewport); await c.page.goto(c.baseUrl); await ready(c.page); }
}
