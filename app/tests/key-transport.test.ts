/** Browser-side key headers reject insecure remote origins before any request can be built. */
import { expect, it } from "vitest";
import { safeKeyOrigin, visitorKeyHeaders } from "@/lib/client/key-transport";

it.each(["https://demo.example", "http://localhost:3100", "http://127.0.0.1:3100", "http://127.2.3.4", "http://[::1]:3100"])("permits HTTPS or loopback development at %s", (url) => {
  expect(safeKeyOrigin(url)).toBe(true);
  expect(visitorKeyHeaders("synthetic-marker", true, url)).toEqual({ "x-openai-key": "synthetic-marker" });
});
it.each(["http://demo.example", "http://localhost.attacker.example", "http://192.0.2.1", "ftp://localhost"])("never constructs a key header for %s", (url) => {
  expect(() => visitorKeyHeaders("synthetic-marker", true, url)).toThrow("HTTPS");
});
it("keeps no-key deterministic requests usable on plain HTTP", () => {
  expect(visitorKeyHeaders("", true, "http://demo.example")).toEqual({});
  expect(visitorKeyHeaders("synthetic-marker", false, "http://demo.example")).toEqual({});
});
