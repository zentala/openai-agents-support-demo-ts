/** Actual-host checks and viewport captures for the coordinator's first gallery review. No external requests or model calls. */
import path from "node:path";

export async function checkFocus(page, step, check) {
  const actual = await page.locator("#scene").evaluate(el => {
    el.getAnimations().forEach(animation => animation.finish());
    const image = el.querySelector("img").getBoundingClientRect(), stage = el.parentElement.getBoundingClientRect();
    const ring = el.querySelector(".spotlight").getBoundingClientRect();
    const scale = new DOMMatrixReadOnly(getComputedStyle(el).transform).a;
    return { image: { x: image.x, y: image.y, right: image.right, bottom: image.bottom, width: image.width, height: image.height },
      stage: { x: stage.x, y: stage.y, right: stage.right, bottom: stage.bottom },
      ring: { x: ring.x, y: ring.y, width: ring.width, height: ring.height }, scale };
  });
  const { image, stage, ring, scale } = actual, f = step.focus;
  check(Math.abs(image.x - stage.x) < .5 && Math.abs(image.y - stage.y) < .5 && Math.abs(image.right - stage.right) < .5
    && Math.abs(image.bottom - stage.bottom) < .5, "stage height follows the whole frame, no crop");
  check(Math.abs(image.width / image.height - step.width / step.height) < .01, "frame keeps its recorded aspect ratio");
  const expected = { x: image.x + image.width * f.x / step.width - 6, y: image.y + image.height * f.y / step.height - 6,
    width: image.width * f.width / step.width + 12, height: image.height * f.height / step.height + 12 };
  for (const key of ["x", "y", "width", "height"]) check(Math.abs(ring[key] - expected[key]) < 1, `measured focus ring ${key} includes 6px padding`);
  check(scale === 1, "frame is never zoomed");
}

export async function checkReviewLayout(page, width, check) {
  check(await page.locator(".legend-pair").count() === 2, "legend has two badge/explanation pairs");
  check((await page.locator(".legend").innerText()).includes("model decides"), "AI legend explains model decides");
  check(await page.locator('#meta [data-icon="shows"]').count() === 1, "Shows metadata has its own icon");
  check(await page.locator('#meta [data-icon="steps"]').count() === 1, "step count has its own icon");
  check(await page.locator('[data-icon="play"]:not(#player [data-icon="play"])').count() === 0, "play is used only inside the player");
  const brand = await page.locator(".brand").boundingBox(); check(brand.height >= 40, "brand is a 40px target");
  for (const radio of await page.getByRole("radio").all()) {
    const box = await radio.boundingBox(); check(box.width >= 40 && box.height >= 40, "speed choices are 40px targets");
  }
  const cards = await page.locator(".three .step").evaluateAll(els => els.map(el => ({ height: el.getBoundingClientRect().height,
    buttonY: el.querySelector("a.b").getBoundingClientRect().y, tile: getComputedStyle(el.querySelector("h3 > span")).backgroundColor })));
  check(cards.every(c => c.tile === "rgb(239, 246, 255)"), "live cards use light-blue icon tiles");
  if (width === 1440) {
    check(Math.max(...cards.map(c => c.height)) - Math.min(...cards.map(c => c.height)) < 1, "desktop cards have equal height");
    check(Math.max(...cards.map(c => c.buttonY)) - Math.min(...cards.map(c => c.buttonY)) < 1, "desktop buttons align at the bottom");
  }
  const limit = await page.locator(".account-link").boundingBox(), key = await page.locator(".card-actions a.b").first().boundingBox();
  check(limit.y >= key.y + key.height, "spend-limit link follows the key button");
  if (width === 390) {
    check(await page.locator(".hero-full").isHidden(), "mobile hides long hero copy");
    check((await page.locator(".hero-short").innerText()).split(/[.!?]+/).filter(s => s.trim()).length === 2, "mobile hero has two sentences");
  }
}

export async function checkShortcuts(page, check) {
  await page.locator('#speed [data-speed="1"]').click();
  await page.locator("#player").focus();
  await page.keyboard.press("Space"); check(await page.locator("#play").getAttribute("aria-label") === "Pause", "focused player Space plays");
  await page.keyboard.press("Space"); check(await page.locator("#play").getAttribute("aria-label") === "Play", "focused player Space pauses");
  await page.locator("#plain").focus(); await page.keyboard.press("Space");
  check(await page.locator("#play").getAttribute("aria-label") === "Play", "Space on another button does not start playback");
  check(await page.locator("#plain").getAttribute("aria-pressed") === "true", "Space retains the other button's native action");
  await page.keyboard.press("Space");
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press("Space"); check(await page.locator("#play").getAttribute("aria-label") === "Pause", "page-body Space plays");
  await page.keyboard.press("Space");
  const caption = await page.locator("#cap").innerText();
  await page.locator('#speed [data-speed="1"]').focus(); await page.keyboard.press("ArrowRight");
  check(await page.locator('#speed [data-speed="1.5"]').getAttribute("aria-checked") === "true", "radio arrows choose playback speed");
  check(await page.locator("#cap").innerText() === caption, "radio arrows do not change scenario steps");
}

export async function checkResize(page, step, check) {
  const original = page.viewportSize();
  for (const viewport of [{ width: 819, height: 900 }, { width: 820, height: 900 }, { width: original.width === 390 ? 1440 : 390, height: 900 }, original]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(step => {
      const ring = document.querySelector("#spotlight").getBoundingClientRect();
      const stage = document.querySelector("#stage").getBoundingClientRect();
      return Math.abs(ring.width - (stage.width * step.focus.width / step.width + 12)) < 1;
    }, step);
    await checkFocus(page, step, check);
    check(await page.locator(".hero-short").isVisible() === (viewport.width < 820), "mobile hero uses the strict 820px breakpoint");
  }
}

export async function captureReview(page, width, directory) {
  const shot = async name => {
    await page.waitForFunction(() => { const img = document.querySelector("#frame"); return img.complete && img.naturalWidth === 1440; });
    await page.screenshot({ path: path.join(directory, `h14-${name}-${width}.png`), fullPage: false, animations: "disabled" });
  };
  await page.locator('[data-scenario="human-request"]').click();
  await page.evaluate(() => window.scrollTo(0, 0)); await shot("top");
  await page.locator("#next").click();
  await page.locator("#scene").evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
  await page.locator(width === 1440 ? ".view" : "#player").evaluate(el => el.scrollIntoView({ block: "start" })); await shot("player-mid");
  await page.locator("#next").click(); await page.locator("#next").click();
  await page.locator("#scene").evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
  await page.locator(width === 1440 ? ".view" : "#player").evaluate(el => el.scrollIntoView({ block: "start" })); await shot("player-last");
  await page.locator("#live").evaluate(el => el.scrollIntoView({ block: "start" })); await shot("live");
}
