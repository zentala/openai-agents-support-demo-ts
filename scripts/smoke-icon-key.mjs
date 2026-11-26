/** Real visitor-key Clear in the existing isolated public-mode harness; synthetic input, no model call. */
import path from "node:path";

export async function captureKeyIcons({ page, check }) {
  const field = page.getByTestId("visitor-key");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await field.waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);
    await field.fill("h13-synthetic-marker");
    const clear = page.getByRole("button", { name: "Clear", exact: true });
    await clear.focus();
    check(`h13 R1: public ${width}px Clear uses its registry icon`, await clear.locator('[data-icon="clear"]').count() === 1);
    check(`h13 R1: public ${width}px key group and Clear are one 40px frame, no gap`, await field.evaluate((element) => {
      const frame = element.closest('[data-testid="visitor-key-group"]').getBoundingClientRect();
      const input = element.getBoundingClientRect(), button = element.closest('[data-testid="visitor-key-group"]').querySelector("button").getBoundingClientRect();
      return frame.height === 40 && input.height >= 38 && button.height >= 38 && Math.abs(input.right - button.left) <= 1;
    }));
    await clear.click();
    check(`h13 R1: public ${width}px real Clear removes the synthetic tab input`, await field.inputValue() === "");
    await clear.focus();
    await page.evaluate(() => window.scrollTo(0, 0));
    check(`h13 R1: public ${width}px key controls have no page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.resolve("docs/screenshots", `h13-key-clear-${width}.png`) });
  }
}
