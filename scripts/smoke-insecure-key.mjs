/** Render the real app under a routed non-loopback HTTP origin; intercept model routes to prevent any API usage. */
export async function checkInsecureKey({ browser, baseUrl, check }) {
  const context = await browser.newContext();
  let modelRequests = 0;
  try {
    await context.route("http://demo-http.example/**", async (route) => {
      const original = new URL(route.request().url());
      if (original.pathname === "/api/chat" || original.pathname === "/api/admin/actions") {
        modelRequests++;
        await route.fulfill({ status: 400, json: { errorType: "UnexpectedRequest", message: "Insecure key request reached the network" } });
        return;
      }
      if (original.pathname.endsWith("/stream")) {
        // This fixture tests client transport, not SSE. Do not buffer an infinite upstream stream.
        await route.fulfill({ contentType: "text/event-stream", body: ": transport fixture\n\n" });
        return;
      }
      const response = await route.fetch({ url: `${baseUrl}${original.pathname}${original.search}` });
      await route.fulfill({ response });
    });
    const page = await context.newPage();
    await page.goto("http://demo-http.example/");
    await page.getByTestId("key-https-warning").waitFor();
    check("non-loopback HTTP shows an HTTPS warning", true);
    await page.getByTestId("visitor-key").fill("sk-" + "synthetic-insecure-marker");
    await page.getByTestId("chat-input").fill("Where is my order?");
    await page.getByTestId("chat-input").press("Enter");
    await page.waitForFunction(() => document.querySelector('[data-testid="workspace"]')?.textContent.includes("InsecureKeyTransport"));
    check("HTTP key transport refuses before a model request reaches the network", modelRequests === 0);
  } finally {
    await context.unrouteAll({ behavior: "ignoreErrors" });
    await context.close();
  }
}
