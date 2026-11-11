/** Memory bounds of the order-number limiter, including floods of denied requests and table eviction. */
import { beforeEach, describe, expect, it } from "vitest";
import { ATTEMPT_WINDOW_MS, clearOrderAttempts, MAX_ATTEMPTS_PER_ORDER, MAX_TRACKED_ORDERS, takeOrderAttempt } from "@/lib/guest/order-attempts";

// Inspect only synthetic test state; no diagnostic accessors are added to the production API.
const table = (globalThis as unknown as { __nordicOrderAttempts: Map<string, number[]> }).__nordicOrderAttempts;

beforeEach(() => clearOrderAttempts());

describe("order attempt memory bounds", () => {
  it("denied attempts neither grow the bucket nor extend its expiry", () => {
    const now = 1_000;
    for (let i = 0; i < MAX_ATTEMPTS_PER_ORDER; i++) expect(takeOrderAttempt("1004", now)).toBe(true);
    const original = [...table.get("1004")!];
    for (let i = 1; i <= 500; i++) expect(takeOrderAttempt("1004", now + i)).toBe(false);
    expect(table.size).toBe(1);
    expect(table.get("1004")).toEqual(original);
    expect(table.get("1004")).toHaveLength(MAX_ATTEMPTS_PER_ORDER);
    expect(takeOrderAttempt("1004", now + ATTEMPT_WINDOW_MS)).toBe(true);
    expect(table.get("1004")).toEqual([now + ATTEMPT_WINDOW_MS]);
  });

  it("caps distinct order numbers and evicts the oldest when none has expired", () => {
    for (let i = 0; i < MAX_TRACKED_ORDERS; i++) expect(takeOrderAttempt(`order-${i}`, 1_000)).toBe(true);
    expect(table.size).toBe(MAX_TRACKED_ORDERS);
    expect(takeOrderAttempt("overflow", 1_001)).toBe(true);
    expect(table.size).toBe(MAX_TRACKED_ORDERS);
    expect(table.has("order-0")).toBe(false);
    expect(table.has("order-1")).toBe(true);
    expect(table.has("overflow")).toBe(true);
  });

  it("prunes expired buckets before evicting an older but still live bucket", () => {
    takeOrderAttempt("live-first", ATTEMPT_WINDOW_MS - 1);
    takeOrderAttempt("expired-second", 0);
    for (let i = 0; i < MAX_TRACKED_ORDERS - 2; i++) takeOrderAttempt(`fill-${i}`, ATTEMPT_WINDOW_MS - 1);
    takeOrderAttempt("overflow", ATTEMPT_WINDOW_MS);
    expect(table.size).toBe(MAX_TRACKED_ORDERS);
    expect(table.has("expired-second")).toBe(false);
    expect(table.has("live-first")).toBe(true);
    expect(table.has("overflow")).toBe(true);
  });
});
