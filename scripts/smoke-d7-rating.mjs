/**
 * Captures the consultant console's rating correction field (H15 D7) at 390px and 1440px with no model call.
 *
 * The console only draws the field under an agent reply of an open conversation, and a real one needs a model run.
 * Here the two read endpoints the console polls (/api/admin/state and /api/admin/threads/<id>) are answered from
 * fixtures inside Playwright, so the real page, components and styles are what gets measured.
 *
 *   node scripts/smoke-d7-rating.mjs http://127.0.0.1:3100
 *
 * Writes docs/screenshots/h15-rated-conversation-{1440,390}.png (git-ignored) and asserts the field geometry.
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const { chromium } = createRequire(path.join(root, "app/package.json"))("playwright");
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3100";
const shots = path.join(root, "docs/screenshots");
mkdirSync(shots, { recursive: true });

const THREAD_ID = "thread-d7-fixture";
const ENTRY_ID = "entry-d7-agent";
// The "Correction (optional)" placeholder needs about 170px; the phone value leaves room for padding.
const MIN_FIELD_WIDTH_PHONE = 200;
const MIN_FIELD_WIDTH_DESKTOP = 200;
const NOW =1_795_000_000_000;

const state = {
  protected: false, consultants: ["Marta Nowak"], tickets: [], approvals: [], audit: [], ratingsCount: 1, reports: [],
  metrics: { conversations: 1, escalatedConversations: 0, escalationRate: 0, guardrailTrips: 0, toolErrors: 0, approvals: { pending: 0, approved: 0, rejected: 0 } },
};
const thread = {
  customerOrder: { status: "unverified" }, threadId: THREAD_ID, customerId: "c-anna", customerName: "Anna Kowalska",
  traceId: "trace_fixture", traceUrl: "https://example.invalid/trace", takeover: { status: "agent" }, staffLockouts: [],
  transcript: [
    { id: "entry-d7-customer", role: "customer", text: "Where is my order 1001?", ts: NOW },
    { id: ENTRY_ID, role: "agent", text: "Order 1001 is in transit and should arrive on Friday.", ts: NOW + 4000, sender: { kind: "ai" } },
  ],
  ratings: { [ENTRY_ID]: { rating: "down", correction: "", ratedBy: "Marta Nowak" } },
};

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); console.log(`${ok ? "PASS" : "FAIL"} ${message}`); };

const browser = await chromium.launch();
try {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width === 390 ? 3 : 1 });
    await context.route("**/api/admin/state*", (route) => route.fulfill({ json: state }));
    await context.route("**/api/admin/threads/**", (route) => route.fulfill({ json: thread }));
    const page = await context.newPage();
    await page.goto(`${baseUrl}/admin#thread=${THREAD_ID}`);
    const field = page.getByTestId("rating-correction");
    await field.waitFor({ state: "visible", timeout: 30000 });
    await field.scrollIntoViewIfNeeded();
    const box = await field.boundingBox();
    check(Boolean(box) && box.height >= 40 && box.x >= 0 && box.x + box.width <= width, `${width}px correction field is visible, ${Math.round(box?.height ?? 0)}px high, inside the viewport`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px no horizontal overflow`);
    const minWidth = width === 390 ? MIN_FIELD_WIDTH_PHONE : MIN_FIELD_WIDTH_DESKTOP;
    check(box.width >= minWidth, `${width}px correction field keeps a usable width: ${Math.round(box.width)}px >= ${minWidth}px`);
    const border =await field.evaluate((el) => { const s = getComputedStyle(el); return [s.borderTopWidth, s.borderLeftWidth, s.borderBottomWidth]; });
    check(border.join(" ") === "0px 0px 1px", `${width}px field has only a bottom rule (${border.join(" ")})`);
    check((await page.getByTestId("rating-controls").getAttribute("data-rating")) === "down", `${width}px rated-down state shown`);
    await page.screenshot({ path: path.join(shots, `h15-rated-conversation-${width}.png`) });
    await context.close();
  }
} finally { await browser.close(); }
if (failures.length) { console.error(`FAILED: ${failures.join("; ")}`); process.exit(1); }
