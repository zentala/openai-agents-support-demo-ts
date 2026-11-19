/** Proxy trust and saturation regressions use independent limiter instances, clocks and synthetic IPs. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { publicRateLimit } from "@/lib/security/public-rate-limit";

let limit: typeof publicRateLimit;
const request = (forwarded: string) => new Request("https://demo.example", { headers: { "x-forwarded-for": forwarded } });
beforeEach(async () => {
  vi.stubEnv("PUBLIC_DEMO", "true");
  vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
  vi.spyOn(Date, "now").mockReturnValue(1_000);
  vi.resetModules();
  limit = (await import("@/lib/security/public-rate-limit")).publicRateLimit;
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("ignores spoofed leftmost addresses by default", () => {
  for (let i = 0; i < 30; i++) expect(limit(request(`spoof-${i}, 192.0.2.1`), "chat")).toBeUndefined();
  expect(limit(request("another-spoof, 192.0.2.1"), "chat")?.status).toBe(429);
  expect(limit(request("spoof, 192.0.2.2"), "chat")).toBeUndefined();
});

it("selects a configured address from the right and ignores headers at zero hops", () => {
  vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
  for (let i = 0; i < 30; i++) expect(limit(request(`spoof-${i}, 192.0.2.3, proxy-${i}`), "chat")).toBeUndefined();
  expect(limit(request("spoof, 192.0.2.3, proxy"), "chat")?.status).toBe(429);
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  for (let i = 0; i < 30; i++) expect(limit(request(`different-${i}`), "chat")).toBeUndefined();
  expect(limit(request("new-address"), "chat")?.status).toBe(429);
});

it("evicts the oldest live bucket at capacity instead of refusing all new visitors", () => {
  const oldest = request("192.0.2.4");
  for (let i = 0; i < 20; i++) expect(limit(oldest, "threads")).toBeUndefined();
  expect(limit(oldest, "threads")?.status).toBe(429);
  for (let i = 0; i < 10_000; i++) expect(limit(request(`synthetic-${i}`), "threads")).toBeUndefined();
  expect(limit(oldest, "threads")).toBeUndefined();
});

it("expires buckets before considering oldest-bucket eviction", () => {
  for (let i = 0; i < 10_000; i++) limit(request(`expired-${i}`), "threads");
  vi.mocked(Date.now).mockReturnValue(61_001);
  const fresh = request("192.0.2.5");
  for (let i = 0; i < 20; i++) expect(limit(fresh, "threads")).toBeUndefined();
  expect(limit(fresh, "threads")?.status).toBe(429);
});
