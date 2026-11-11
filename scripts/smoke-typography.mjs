/** Measure the actual DOM, including text reachable by scrolling, excluding hidden tabs/details. */
export async function checkTypography(page, check, view) {
  const failures = await page.evaluate(() => {
    const bad = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!node.textContent.trim() || !parent || parent.closest("script,style")) continue;
      if (!parent.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if (!range.getBoundingClientRect().width) continue;
      const minimum = parent.closest("[data-agent-description], [data-context-value], [data-testid=how-it-works] code") ? 13 : 12;
      const size = parseFloat(getComputedStyle(parent).fontSize);
      if (size < minimum) bad.push({ text: node.textContent.trim().slice(0, 60), size, minimum });
    }
    return bad;
  });
  check(`layout: ${view} rendered text meets the 12px/13px floors`, failures.length === 0, JSON.stringify(failures));
}
