/** Short real UI tour: deterministic escalation, consultant takeover and a pushed reply. No model calls. */
export async function flowScreencast({ page, baseUrl, check }) {
  await page.goto(baseUrl);
  await page.getByTestId("chat-start").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000); // Give the viewer time to read the opening state.
  await page.getByTestId("chat-start").getByRole("button", { name: "Asks for a human", exact: true }).click();
  await page.getByTestId("message-assistant").waitFor();
  await page.waitForTimeout(1400);
  const text = await page.getByTestId("handler-ticket").innerText();
  const ticket = text.match(/T-\d+/)?.[0];
  check("screencast: deterministic request opens a human ticket", Boolean(ticket) && (await page.getByTestId("turn-trace").innerText()).includes("model skipped"));
  await page.getByRole("tab", { name: /^Consultant/ }).click();
  const row = page.locator(`[data-ticket-id="${ticket}"]`);
  await row.waitFor();
  await page.waitForTimeout(600);
  await row.getByTestId("open-conversation").click();
  await page.getByTestId("conversation-pane").waitFor();
  await page.waitForTimeout(1200);
  await page.getByTestId("take-over-button").click();
  await page.getByTestId("human-banner").waitFor();
  await page.waitForTimeout(700);
  const reply = "Hello, I am here to help with your order.";
  await page.getByTestId("reply-input").fill(reply);
  await page.waitForTimeout(600);
  await page.getByTestId("reply-send").click();
  await page.getByTestId("message-consultant").filter({ hasText: reply }).waitFor();
  check("screencast: real consultant reply reaches the customer", true);
  await page.waitForTimeout(2000);
}
