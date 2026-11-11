/** Default-secret warnings across launch modes and server-to-browser configuration. */
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("public SESSION_SECRET", () => {
  it("warns in production when the public default is explicitly configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "dev-only-session-secret-change-me-in-production");
    vi.resetModules();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { credentialSetCookie } = await import("@/lib/security/thread-credential");
    credentialSetCookie("test-thread-1234", false);
    credentialSetCookie("test-thread-5678", false);
    expect(warning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("PUBLIC dev default"));
  });

  it.each(["production", "staging", undefined])("warns once when NODE_ENV is %s", async (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("SESSION_SECRET", "");
    vi.resetModules();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { credentialSetCookie, usesPublicSessionSecret } = await import("@/lib/security/thread-credential");
    expect(usesPublicSessionSecret()).toBe(true);
    credentialSetCookie("test-thread-1234", false);
    credentialSetCookie("test-thread-5678", false);
    expect(warning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("PUBLIC dev default"));
  });

  it.each(["development", "test"])("keeps %s logs quiet, while the UI still warns", async (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("SESSION_SECRET", "");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { credentialSetCookie } = await import("@/lib/security/thread-credential");
    credentialSetCookie("test-thread-1234", false);
    expect(warning).not.toHaveBeenCalled();
    expect(Home().props.children.props.publicSessionSecret).toBe(true);
  });

  it("detects an explicitly configured public default and hides the notice for a private value", () => {
    vi.stubEnv("SESSION_SECRET", "dev-only-session-secret-change-me-in-production");
    expect(Home().props.children.props).toEqual({ publicSessionSecret: true });
    vi.stubEnv("SESSION_SECRET", "synthetic-private-test-value");
    expect(Home().props.children.props).toEqual({ publicSessionSecret: false });
  });
});
