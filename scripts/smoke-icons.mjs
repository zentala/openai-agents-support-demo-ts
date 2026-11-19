/** Icon acceptance in the actual host, extending the existing no-model layout smoke. */
import { copyFile } from "node:fs/promises";
import path from "node:path";

const ready = (page) => page.waitForFunction(() => !document.querySelector('[data-testid="scenario-menu-trigger"]')?.disabled);

export async function checkIconCoverage({ page, baseUrl, check, docShot }) {
  const viewport = page.viewportSize();
  const metadata = await page.request.get(new URL("icons.json", baseUrl).href);
  const sprite = await page.request.get(new URL("icons.svg", baseUrl).href);
  if (!metadata.ok() || !sprite.ok()) throw new Error(`Icon exports: JSON HTTP ${metadata.status()}, SVG HTTP ${sprite.status()}`);
  const { icons } = await metadata.json();
  const xml = await sprite.text();
  const valid = await page.evaluate(({ xml, icons }) => {
    const svg = new DOMParser().parseFromString(xml, "image/svg+xml");
    return !svg.querySelector("parsererror") && svg.querySelectorAll("symbol").length === Object.keys(icons).length
      && Object.values(icons).every(({ symbol }) => svg.getElementById(symbol)?.getAttribute("viewBox") === "0 0 24 24");
  }, { xml, icons });
  check("h13: actual-host SVG/JSON export has every registered symbol", valid);
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.goto(baseUrl);
      await ready(page);
      const missing = await page.locator("button").evaluateAll((buttons) => buttons.filter((button) => button.getClientRects().length && !button.querySelector("svg[data-icon]")).map((button) => button.textContent || button.getAttribute("aria-label")));
      check(`h13: ${width}px visible actions use registered icons`, missing.length === 0, JSON.stringify(missing));
      check(`h13: ${width}px start rows share their category vocabulary`, await page.getByTestId("start-scenario-list").locator("button:not(:has(svg[data-icon]))").count() === 0);
      const invalid = await page.locator("svg[data-icon]").evaluateAll((svgs, keys) => svgs.filter((svg) => !keys.includes(svg.dataset.icon) || svg.getAttribute("aria-hidden") !== "true" || getComputedStyle(svg).flexShrink !== "0").map((svg) => svg.dataset.icon), Object.keys(icons));
      check(`h13: ${width}px icons are decorative and do not shrink`, invalid.length === 0, JSON.stringify(invalid));
      await page.evaluate(() => window.scrollTo(0, 0));
      await docShot(page, `h13-start-${width}`);
    }
    await checkExternalSymbol(page, baseUrl, check);
  } finally { await page.setViewportSize(viewport); await page.goto(baseUrl); await ready(page); }
}

async function checkExternalSymbol(page, baseUrl, check) {
  await page.evaluate((url) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "h13-external-sprite-probe";
    svg.setAttribute("width", "24"); svg.setAttribute("height", "24");
    const use = document.createElementNS(svg.namespaceURI, "use");
    use.setAttribute("href", url); svg.append(use); document.body.append(svg);
  }, new URL("icons.svg#icon-ticket", baseUrl).href);
  try {
    await page.waitForFunction(() => document.querySelector("#h13-external-sprite-probe use").getBBox().width > 0, null, { timeout: 10000 });
    check("h13: an external sprite symbol actually renders SVG geometry", true);
  } finally { await page.locator("#h13-external-sprite-probe").evaluate((svg) => svg.remove()); }
}

/** These files were written earlier in this same completed layout run; no synthetic transcript is server proof. */
export async function saveIconCaptures() {
  for (const width of [1440, 390]) {
    const consoleSource = width === 1440 ? "h08-consultant-conversation-1440" : "h08-consultant-selected-390";
    for (const [source, target] of [[consoleSource, `h13-consultant-${width}`], [`h12-ai-citation-${width}`, `h13-conversation-${width}`], [`h12-automatic-${width}`, `h13-automatic-${width}`]]) {
      await copyFile(path.resolve("docs/screenshots", `${source}.png`), path.resolve("docs/screenshots", `${target}.png`));
    }
  }
}
