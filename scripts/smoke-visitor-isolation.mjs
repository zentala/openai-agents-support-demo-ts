/** Two real browser contexts test public console isolation with deterministic chat only. */
async function start(api, baseUrl) {
  const made = await api.post(`${baseUrl}/api/threads`, { data: { customerId: "c-anna" } });
  if (made.status() !== 201) throw new Error("Isolation smoke: thread creation failed");
  const { threadId } = await made.json();
  const chat = await api.post(`${baseUrl}/api/chat`, { data: { threadId,
    messages: [{ role: "user", parts: [{ type: "text", text: "I want to speak to a human" }] }] } });
  if (!chat.ok()) throw new Error("Isolation smoke: deterministic chat failed");
  await chat.body();
  return threadId;
}

async function streamStatus(page, url) {
  return page.evaluate(async (target) => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 5000);
    try {
      const response = await fetch(target, { signal: abort.signal });
      await response.body?.cancel();
      return response.status;
    } finally { clearTimeout(timer); abort.abort(); }
  }, url);
}

export async function checkVisitorIsolation({ browser, page, baseUrl, check }) {
  const second = await browser.newContext();
  try {
    const own = await start(page.request, baseUrl);
    const before = await (await page.request.get(`${baseUrl}/api/admin/state`)).json();
    const foreign = await start(second.request, baseUrl);
    const firstState = await (await page.request.get(`${baseUrl}/api/admin/state`)).json();
    const secondState = await (await second.request.get(`${baseUrl}/api/admin/state`)).json();
    check("two contexts see only their own tickets", firstState.tickets.some((t) => t.threadId === own)
      && !firstState.tickets.some((t) => t.threadId === foreign)
      && secondState.tickets.length === 1 && secondState.tickets[0].threadId === foreign);
    check("foreign conversation does not change visitor metrics", JSON.stringify(before.metrics) === JSON.stringify(firstState.metrics));
    for (const [api, allowed, denied] of [[page.request, own, foreign], [second.request, foreign, own]]) {
      check("own transcript visible and foreign transcript refused", (await api.get(`${baseUrl}/api/admin/threads/${allowed}`)).status() === 200
        && (await api.get(`${baseUrl}/api/admin/threads/${denied}`)).status() === 403);
      const refusal = await api.post(`${baseUrl}/api/admin/actions`, { data: { type: "take_over", consultant: "Marta Nowak", threadId: denied } });
      check("foreign takeover refused in each direction", refusal.status() === 403);
    }
    const secondPage = await second.newPage();
    await secondPage.goto(`${baseUrl}/?tab=consultant`);
    await secondPage.getByText("This browser's conversations", { exact: true }).waitFor();
    check("public console works without an admin password", await secondPage.getByTestId("unprotected-banner").count() === 0);
    check("own inspector opens and foreign inspector is refused", await streamStatus(page, `${baseUrl}/api/admin/inspector/${own}/stream`) === 200
      && await streamStatus(page, `${baseUrl}/api/admin/inspector/${foreign}/stream`) === 403);
    check("second visitor cannot inspect the first visitor", await streamStatus(secondPage, `${baseUrl}/api/admin/inspector/${own}/stream`) === 403);
  } finally { await second.close(); }
}
