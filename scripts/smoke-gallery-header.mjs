/** Inspect the new gallery link in the actual built app's wide/narrow header without any model calls. */
import { createRequire } from "node:module";
import path from "node:path";
import { startGalleryApp } from "./gallery-app.mjs";
import { assertSafeGalleryFrame } from "./gallery-safety.mjs";
const require = createRequire(path.resolve(import.meta.dirname, "../app/package.json"));
const { chromium } = require("playwright");
const app = await startGalleryApp();
let browser;
try {
  browser = await chromium.launch();
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await page.goto(app.url);
    await assertSafeGalleryFrame(page);
    const link = page.getByTestId("watch-scenarios");
    await link.waitFor();
    if (await link.getAttribute("href") !== "https://zentala.github.io/openai-agents-support-demo-ts/") throw new Error("GalleryHeaderDestination");
    await link.scrollIntoViewIfNeeded();
    const box = await link.boundingBox();
    if (!box || box.width < 24 || box.height < 24) throw new Error("GalleryHeaderTargetSize");
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error("GalleryHeaderOverflow");
    await page.screenshot({ path: path.resolve("docs/screenshots", `h14-app-header-${width}.png`), fullPage: false });
    console.log(`PASS built app gallery header ${width}px`);
    await page.close();
  }
  const fixture = await browser.newPage();
  await fixture.setContent('<div data-testid="public-session-secret">Demo security: SESSION_SECRET uses the public default.</div>');
  let refused = false;
  try { await assertSafeGalleryFrame(fixture); } catch (error) { refused = error.message.startsWith("GalleryUnsafeSessionSecret:"); }
  if (!refused) throw new Error("GallerySafetyGuardDidNotRefuseVisibleNotice");
  await fixture.getByTestId("public-session-secret").evaluate(el => { el.hidden = true; });
  await assertSafeGalleryFrame(fixture);
  await fixture.close();
  console.log("PASS recording safety: private app has no notice; visible-warning fixture refused; hidden fixture accepted");
} finally { await browser?.close(); app.close(); }
