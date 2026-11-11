/** Opt-in feedback acceptance: real Agentation UI and browser storage, no model or feedback server. */
export async function checkAnnotations({ browser, baseUrl, check }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const loaded = [];
  page.on("response", async (response) => {
    if (response.url().includes("/_next/static/") && response.url().endsWith(".js")) loaded.push(await response.text());
  });
  try {
    await page.goto(baseUrl);
    await page.getByTestId("chat-start").waitFor();
    check("annotations: default page has no settings, toolbar or Agentation payload", await page.getByTestId("annotation-settings").count() === 0 && await page.locator("agentation-toolbar").count() === 0 && !loaded.some((text) => text.includes("data-agentation-toolbar")));
    await page.goto(new URL("?annotate=1", baseUrl).href);
    await page.getByTestId("annotation-settings").waitFor();
    await page.getByRole("button", { name: "Start feedback mode", exact: true }).waitFor();
    await page.getByTestId("annotation-settings").click();
    check("annotations: explicit URL flag enables the switch", await page.getByTestId("annotations-switch").getAttribute("aria-checked") === "true");
    await page.screenshot({ path: "docs/screenshots/h08-settings-on-1440.png" });
    await page.getByTestId("annotations-switch").click();
    await page.getByTestId("annotation-toolbar").waitFor({ state: "detached" });
    await page.screenshot({ path: "docs/screenshots/h08-settings-off-1440.png" });
    await page.goto(baseUrl);
    await page.getByTestId("annotation-settings").waitFor();
    check("annotations: access and disabled preference survive navigation", await page.getByTestId("annotation-toolbar").count() === 0);
    await page.getByTestId("annotation-settings").click();
    await page.getByTestId("annotations-switch").click();
    await page.keyboard.press("Escape");
    await createAndCopy(page, check);
    await page.reload();
    await page.getByRole("button", { name: "Start feedback mode", exact: true }).waitFor();
    check("annotations: enabled preference survives reload", await page.getByTestId("annotation-toolbar").count() === 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("annotation-settings").scrollIntoViewIfNeeded();
    await page.getByTestId("annotation-settings").click();
    check("annotations: narrow Settings switch is reachable without page overflow", await page.getByTestId("annotations-switch").isVisible() && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: "docs/screenshots/h08-settings-on-390.png" });
    await page.getByTestId("annotations-switch").click();
    await page.getByTestId("annotation-toolbar").waitFor({ state: "detached" });
    await page.screenshot({ path: "docs/screenshots/h08-settings-off-390.png" });
  } finally { await context.close(); }
}

async function createAndCopy(page, check) {
  // Observe the real copy event; do not replace the package's clipboard implementation.
  await page.evaluate(() => document.addEventListener("copy", () => {
    window.__h08Copied = document.activeElement?.value ?? document.getSelection()?.toString();
  }));
  await page.getByRole("button", { name: "Start feedback mode", exact: true }).click();
  await page.getByRole("heading", { name: "Current turn", exact: true }).click();
  await page.getByPlaceholder("What should change?", { exact: true }).fill("H08 smoke: keep this heading readable.");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: /^Copy/ }).click();
  await page.waitForFunction(() => window.__h08Copied?.includes("H08 smoke: keep this heading readable."));
  check("annotations: exact synthetic note and heading copied as feedback", await page.evaluate(() => window.__h08Copied.includes("Current turn")));
  await page.screenshot({ path: "docs/screenshots/h08-annotation-copied-1440.png" });
}
