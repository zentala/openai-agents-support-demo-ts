/** Bounded fixed-window limits for the single-process public demo; no payloads are recorded. */
import { isPublicDemo } from "./request-key";

const WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;
const buckets = new Map<string, { count: number; until: number }>();
const limits = { chat: [30, 10], photo: [10, 5], threads: [20, 20] } as const;

/** SECURITY: count from the trusted end; a client may prepend arbitrary forwarded addresses. */
function clientBucket(req: Request): string {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  if (!Number.isInteger(hops) || hops < 1 || hops > 32) return "unknown";
  const chain = req.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim());
  return chain && chain.length >= hops ? chain[chain.length - hops] || "unknown" : "unknown";
}

/** Evict oldest buckets only after expired ones; preserve counters involved in this request. */
function makeRoom(keys: string[]): void {
  const missing = keys.filter((key) => !buckets.has(key)).length;
  for (const key of buckets.keys()) {
    if (buckets.size + missing <= MAX_BUCKETS) break;
    if (!keys.includes(key)) buckets.delete(key);
  }
}

export function publicRateLimit(req: Request, action: keyof typeof limits, threadId?: string): Response | undefined {
  if (!isPublicDemo()) return;
  const ip = clientBucket(req);
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
  const checks: [string, number][] = [[`${action}:ip:${ip}`, limits[action][0]]];
  if (threadId) checks.push([`${action}:thread:${threadId}`, limits[action][1]]);
  for (const [key, limit] of checks) {
    const bucket = buckets.get(key);
    if ((bucket?.count ?? 0) >= limit) {
      return Response.json({ errorType: "RateLimitExceeded", message: `Too many ${action} requests. Try again in 60 seconds.` },
        { status: 429, headers: { "Retry-After": "60" } });
    }
  }
  makeRoom(checks.map(([key]) => key));
  for (const [key] of checks) {
    const bucket = buckets.get(key) ?? { count: 0, until: now + WINDOW_MS };
    bucket.count++;
    buckets.set(key, bucket);
  }
}
