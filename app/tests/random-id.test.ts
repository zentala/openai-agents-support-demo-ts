/** randomId must work when crypto.randomUUID is missing (plain-HTTP pages). */
import { afterEach, describe, expect, it } from "vitest";
import { randomId } from "@/lib/client/random-id";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const original = Object.getOwnPropertyDescriptor(crypto, "randomUUID");

/** Simulates a non-secure context, where browsers do not define randomUUID. */
function hideRandomUUID() {
  Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
}

describe("randomId", () => {
  afterEach(() => {
    if (original) Object.defineProperty(crypto, "randomUUID", original);
    else delete (crypto as { randomUUID?: unknown }).randomUUID;
  });

  it("falls back to getRandomValues when randomUUID is unavailable", () => {
    hideRandomUUID();
    const id = randomId();
    expect(id).toMatch(UUID_V4);
    expect(randomId()).not.toBe(id);
  });

  it("uses randomUUID when available", () => {
    expect(randomId()).toMatch(UUID_V4);
  });
});
