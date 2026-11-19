/**
 * Smoke flows for wave 3b (data collection), driven with Playwright against a real server and the real model.
 * Called from smoke-v1.mjs, which owns the browser, the customer page and `check`.
 *
 *   flowStreamRefused  the customer SSE channel and chat refuse a request without the thread credential
 *   flowClaim          damage claim: one question at a time, slots filled in the Agent View, photo upload
 *   flowSecureForm     refund of a cash-on-delivery order: secure IBAN form; an IBAN typed in the chat is masked
 *   flowGuest          guest: no data before verification, a failed attempt, then success
 *   flowAddress        address change: card with old vs new, typing "yes" changes nothing, the click does
 *
 * Each flow takes `ctx`: { page, baseUrl, check, idle, docShot, TIMEOUT, probes }. `probes.chatBodies` collects
 * every /api/chat response body so a flow can assert that a secret never appeared in one.
 */

const IBAN = "PL61 1090 1014 0000 0712 1981 2874";
const IBAN_PATTERN = /PL61|1090\s?1014|109010140000|0712\s?1981/;
// A valid 1x1 PNG: enough for the server's magic-number check.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const today = () => new Date().toISOString().slice(0, 10);

/** Records every chat response body (call once, right after the page is created). */
export function installProbes(page) {
  const probes = { chatBodies: [] };
  page.on("response", async (response) => {
    if (new URL(response.url()).pathname === "/api/chat") probes.chatBodies.push(await response.text().catch(() => ""));
  });
  return probes;
}

const sendEnabled = (page) => page.waitForFunction(() => document.querySelector('[data-testid="send-button"]')?.disabled === false);

/** Fresh conversation as another customer (or "guest"): waits until the server made the thread. */
async function startAs(ctx, customerId) {
  await ctx.page.getByTestId("customer-select").selectOption(customerId);
  await sendEnabled(ctx.page);
  await ctx.page.waitForTimeout(400); // let the two SSE channels connect before the first message
}

/** Sends a chat message and returns the assistant's newest text once the run is over. */
async function say(ctx, text) {
  const { page } = ctx;
  const before = await page.getByTestId("message-assistant").count();
  await page.getByTestId("chat-input").fill(text);
  await page.getByTestId("send-button").click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="message-assistant"]').length > n, before, { timeout: ctx.TIMEOUT });
  await ctx.idle();
  return page.getByTestId("message-assistant").last().innerText();
}

const panelText = (page) => page.getByTestId("agent-panel").innerText();
const slotFilled = (page, form, key) => page.getByTestId(`slot-${form}-${key}`).getAttribute("data-filled").then((v) => v === "true").catch(() => false);

export async function flowStreamRefused(ctx) {
  const { page, check } = ctx;
  const url = (path) => new URL(path, ctx.baseUrl).href;
  const result = await page.evaluate(async ({ create, chat }) => {
    // credentials: "omit" = no cookies at all, like a stranger who only knows (or guessed) a thread id.
    const made = await fetch(create, { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: "c-anna" }) });
    const { threadId } = await made.json();
    const stream = await fetch(`/api/threads/${threadId}/stream?customerId=c-anna`, { credentials: "omit" });
    const post = await fetch(chat, { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId, messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] }) });
    // Own cookie for ANOTHER thread must not open this one either.
    const mine = await fetch(create, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: "c-anna" }) });
    const { threadId: mineId } = await mine.json();
    const cross = await fetch(`/api/threads/${threadId}/stream`, { credentials: "same-origin" });
    const abort = new AbortController();
    const own = await fetch(`/api/threads/${mineId}/stream`, { credentials: "same-origin", signal: abort.signal });
    const ownType = own.headers.get("content-type");
    abort.abort();
    return { stream: stream.status, post: post.status, cross: cross.status, own: own.status, ownType };
  }, { create: url("api/threads"), chat: url("api/chat") });
  check("SSE stream without the credential is refused (403)", result.stream === 403, JSON.stringify(result));
  check("chat POST without the credential is refused (403)", result.post === 403);
  check("another thread's cookie does not open this thread's stream (403)", result.cross === 403);
  check("the right credential opens the stream (200, text/event-stream)", result.own === 200 && result.ownType?.includes("text/event-stream"));
}

export async function flowClaim(ctx) {
  const { page, check } = ctx;
  await startAs(ctx, "c-lena");
  await say(ctx, "Hello, my wardrobe from order 2002 arrived damaged.");
  await page.getByTestId("slots-damage-claim").waitFor({ timeout: ctx.TIMEOUT });
  check("claim: order slot filled, damage still missing, in the Agent View", (await slotFilled(page, "damage-claim", "orderId")) && !(await slotFilled(page, "damage-claim", "damage")));
  await say(ctx, "The left door has a deep crack along the whole edge.");
  check("claim: damage slot filled after the second answer", await slotFilled(page, "damage-claim", "damage"));
  check("claim: date still missing (asked one field at a time)", !(await slotFilled(page, "damage-claim", "noticedAt")));
  await say(ctx, `I noticed it today, ${today()}.`);
  check("claim: all required slots filled", (await slotFilled(page, "damage-claim", "noticedAt")) && (await slotFilled(page, "damage-claim", "item")));
  if ((await page.getByTestId("photo-upload").count()) === 0) await say(ctx, "I would like to attach a photo of the damage.");
  await page.getByTestId("photo-upload").waitFor({ timeout: ctx.TIMEOUT });
  await ctx.docShot(page.getByTestId("photo-upload"), "wave3b-photo-upload");

  await page.getByTestId("photo-upload-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
  check("claim: a text file is refused with a specific message", /Unsupported file type/.test(await page.getByTestId("photo-upload-error").innerText()));
  const before = await page.getByTestId("message-assistant").count();
  await page.getByTestId("photo-upload-input").setInputFiles({ name: "damage.png", mimeType: "image/png", buffer: PNG });
  await page.getByTestId("photo-upload-done").waitFor({ timeout: ctx.TIMEOUT });
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="message-assistant"]').length > n, before, { timeout: ctx.TIMEOUT });
  await ctx.idle();
  check("claim: photo uploaded and shown as attached in the slots", await slotFilled(page, "damage-claim", "photoId"));
  await ctx.docShot(page.getByTestId("slots"), "wave3b-claim-slots");

  let reply = await say(ctx, "Yes, that summary is correct, please file the claim.");
  if (!/CL-\d+/.test(reply)) reply = await say(ctx, "Yes, please file the claim now.");
  check("claim: submit_claim created the claim (id in the answer)", /CL-\d+/.test(reply), JSON.stringify(reply.slice(0, 100)));
  check("claim: the panel shows the outcome", /created/i.test(await page.getByTestId("slots-outcome").innerText().catch(() => "")));
}

export async function flowSecureForm(ctx) {
  const { page, check, probes } = ctx;
  await startAs(ctx, "c-anna");
  await say(ctx, "I confirm: refund order 1007, 380 PLN, reason: the armchair does not fit. Create the refund.");
  const form = page.locator('[data-testid="secure-form"][data-field="iban"]');
  await form.waitFor({ timeout: ctx.TIMEOUT });
  await ctx.docShot(form, "wave3b-secure-form");
  await page.getByTestId("secure-form-input").fill("PL61 1090 1014 0000 0712 1981 2875");
  await page.getByTestId("secure-form-submit").click();
  check("secure form: a wrong IBAN checksum is refused with a message", /not a valid IBAN/.test(await page.getByTestId("secure-form-error").innerText()));
  const before = await page.getByTestId("message-assistant").count();
  await page.getByTestId("secure-form-input").fill(IBAN);
  await page.getByTestId("secure-form-submit").click();
  await page.getByTestId("secure-form-done").waitFor({ timeout: ctx.TIMEOUT });
  check("secure form: the browser only shows a status with the last four characters", /last 4: 2874/.test(await page.getByTestId("secure-form-done").innerText()));
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="message-assistant"]').length > n, before, { timeout: ctx.TIMEOUT });
  await ctx.idle();
  let nudged = false;
  let refunded = /REFUND_CREATED/.test(await page.getByTestId("runner-output").innerText());
  if (!refunded) {
    // The model sometimes waits for another nudge after the form; one reminder is what a customer would send.
    nudged = true;
    await say(ctx, "I filled in the form. Please create the refund now.");
    refunded = /REFUND_CREATED/.test(await page.getByTestId("runner-output").innerText());
  }
  check("secure form: the refund was created after the form", refunded, nudged ? "(needed a reminder message)" : "(no reminder needed)");
  check("secure form: IBAN never appears in any /api/chat response", !probes.chatBodies.some((body) => IBAN_PATTERN.test(body)));
  check("secure form: IBAN never appears in the Agent View", !IBAN_PATTERN.test(await panelText(page)));
  check("secure form: no error cards", (await page.getByTestId("error-card").count()) === 0);

  // An IBAN typed into the chat is masked before the model, and code shows the form.
  await startAs(ctx, "c-anna");
  probes.chatBodies.length = 0;
  await say(ctx, `Please refund the armchair from order 1007 (380 PLN, does not fit) to my account ${IBAN}.`);
  await page.locator('[data-testid="secure-form"][data-field="iban"]').waitFor({ timeout: ctx.TIMEOUT });
  check("typed IBAN: the secure form is shown by code", true);
  check("typed IBAN: the Agent View logged the masking", /bank account number\(s\) masked/.test(await panelText(page)));
  check("typed IBAN: IBAN is in no /api/chat response and not in the Agent View", !probes.chatBodies.some((b) => IBAN_PATTERN.test(b)) && !IBAN_PATTERN.test(await panelText(page)));
  check("typed IBAN: the answer points to the form", /secure form|formularz|Formular/i.test(await page.getByTestId("message-assistant").last().innerText()));
  await ctx.shot("wave3b-typed-iban");
}

export async function flowGuest(ctx) {
  const { page, check } = ctx;
  await startAs(ctx, "guest");
  const first = await say(ctx, "What is in order 1004 and how much did it cost?");
  check("guest: no order data before verification", !/coffee table|640/i.test(first), JSON.stringify(first.slice(0, 100)));
  await say(ctx, "Order 1004, my e-mail is nobody@example.com");
  await page.waitForSelector('[data-testid="runner-event"][data-kind="verification"]', { timeout: ctx.TIMEOUT });
  const failedText = await page.locator('[data-testid="runner-event"][data-kind="verification"]').first().innerText();
  check("guest: a wrong detail is a failed attempt (and says nothing about which part)", /failed/.test(failedText) && !/e-mail|postal/i.test(failedText), JSON.stringify(failedText));
  await say(ctx, "Sorry, the right e-mail is james.carter@example.com. Where is the order?");
  await page.waitForFunction(() => document.querySelector('[data-testid="context-field-customer_id"]')?.textContent?.includes("c-james"), null, { timeout: ctx.TIMEOUT });
  check("guest: verification bound the conversation to the customer (context shows c-james)", true);
  await ctx.shot("wave3b-guest-verified");
}

export async function flowAddress(ctx) {
  const { page, check } = ctx;
  await startAs(ctx, "c-james");
  await say(ctx, "I need to change the delivery address of order 1004 to 22 Elm Street, Manchester, M1 4BT.");
  await page.getByTestId("address-confirm").waitFor({ timeout: ctx.TIMEOUT });
  check("address: card shows the old and the new address", /Baker Lane/.test(await page.getByTestId("address-old").innerText()) && /Elm Street/.test(await page.getByTestId("address-new").innerText()));
  await ctx.docShot(page.getByTestId("address-confirm"), "wave3b-address-confirm");
  await say(ctx, "Yes, please confirm the new address.");
  check("address: typing 'yes' in the chat did not change the address", !/applied/.test(await page.getByTestId("runner-output").innerText()));
  await page.getByTestId("address-confirm-yes").click();
  await page.waitForSelector('[data-testid="runner-event"][data-kind="address_change"]:has-text("applied")', { timeout: ctx.TIMEOUT });
  await ctx.idle();
  check("address: the Confirm click applied the change", /Elm Street/.test(await page.getByTestId("message-assistant").last().innerText()));
  check("address: the card is history after the click (buttons disabled)", await page.getByTestId("address-confirm-yes").isDisabled());
  const cards = await page.getByTestId("address-confirm").count();
  await say(ctx, "Please change the delivery address of order 1005 to 1 Test Street, Leeds, LS1 1AA.");
  check("address: a delivered order gets no confirmation card", (await page.getByTestId("address-confirm").count()) === cards);
}
