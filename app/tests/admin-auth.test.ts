import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminAuthorized } from "@/lib/admin/auth";
import { config, proxy } from "@/proxy";

const basic = (user: string, password: string) => `Basic ${btoa(`${user}:${password}`)}`;

describe("isAdminAuthorized (pure)", () => {
  it("with a password set: refuses a request without credentials", () => {
    expect(isAdminAuthorized(null, "s3cret")).toBe(false);
  });

  it("with a password set: refuses a wrong password, a non-Basic scheme and broken base64", () => {
    expect(isAdminAuthorized(basic("consultant", "wrong"), "s3cret")).toBe(false);
    expect(isAdminAuthorized("Bearer s3cret", "s3cret")).toBe(false);
    expect(isAdminAuthorized("Basic !!!not-base64!!!", "s3cret")).toBe(false);
    expect(isAdminAuthorized(`Basic ${btoa("no-colon")}`, "s3cret")).toBe(false);
  });

  it("with a password set: allows the right password (any user name, password may contain a colon)", () => {
    expect(isAdminAuthorized(basic("anyone", "s3cret"), "s3cret")).toBe(true);
    expect(isAdminAuthorized(basic("anyone", "a:b"), "a:b")).toBe(true);
  });

  it("decodes the credentials as UTF-8: a password with Polish letters works", () => {
    // Browsers send UTF-8 bytes; btoa cannot encode them, so the header is built from bytes.
    const utf8Basic = (user: string, password: string) => `Basic ${Buffer.from(`${user}:${password}`, "utf-8").toString("base64")}`;
    expect(isAdminAuthorized(utf8Basic("marta", "zażółć-Gęślą"), "zażółć-Gęślą")).toBe(true);
    expect(isAdminAuthorized(utf8Basic("marta", "zazolc-Gesla"), "zażółć-Gęślą")).toBe(false);
  });

  it("without a password (unset or empty): the demo console is open", () => {
    expect(isAdminAuthorized(null, undefined)).toBe(true);
    expect(isAdminAuthorized(null, "")).toBe(true);
  });
});

describe("proxy (the Next.js layer that applies the rule)", () => {
  afterEach(() => vi.unstubAllEnvs());
  const request = (authorization?: string) =>
    new NextRequest("http://localhost/admin", { headers: authorization ? { authorization } : {} });

  it("ADMIN_PASSWORD set: 401 with a Basic challenge when no credentials are sent", () => {
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    const response = proxy(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
  });

  it("ADMIN_PASSWORD set: lets the request through with the right credentials", () => {
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    const response = proxy(request(basic("marta", "s3cret")));
    expect(response.status).toBe(200);
    // NextResponse.next() marks a pass-through with this header.
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("ADMIN_PASSWORD unset: lets the request through", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(proxy(request()).headers.get("x-middleware-next")).toBe("1");
  });

  it("the proxy matcher covers /api/reset and the admin API (the Next.js layer decides what reaches proxy())", () => {
    expect(config.matcher).toEqual(expect.arrayContaining(["/api/reset", "/api/admin/:path*", "/admin/:path*"]));
  });

  it("/api/reset is behind the same password as the console", () => {
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    const reset = (authorization?: string) =>
      new NextRequest("http://localhost/api/reset", { method: "POST", headers: authorization ? { authorization } : {} });
    expect(proxy(reset()).status).toBe(401);
    expect(proxy(reset(basic("marta", "s3cret"))).headers.get("x-middleware-next")).toBe("1");
  });
});

describe("proxy: CSRF on state-changing admin requests", () => {
  afterEach(() => vi.unstubAllEnvs());
  const post = (headers: Record<string, string>) =>
    new NextRequest("http://demo.local/api/admin/actions", {
      method: "POST",
      headers: { host: "demo.local", authorization: basic("marta", "s3cret"), ...headers },
    });

  it("refuses a POST whose Origin is another site, even with valid Basic credentials", () => {
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    const response = proxy(post({ origin: "https://evil.example" }));
    expect(response.status).toBe(403);
  });

  it("refuses Origin: null and a cross-site Sec-Fetch-Site without Origin", () => {
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    expect(proxy(post({ origin: "null" })).status).toBe(403);
    expect(proxy(post({ "sec-fetch-site": "cross-site" })).status).toBe(403);
  });

  it("accepts a POST from the console's own origin, also behind a reverse proxy", () => {
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    expect(proxy(post({ origin: "http://demo.local" })).headers.get("x-middleware-next")).toBe("1");
    const proxied = post({ origin: "https://demo.example", host: "127.0.0.1:4336", "x-forwarded-host": "demo.example" });
    expect(proxy(proxied).headers.get("x-middleware-next")).toBe("1");
  });

  it("accepts a script without Origin (not a browser, so not a CSRF vector) and never blocks GET", () => {
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    expect(proxy(post({})).headers.get("x-middleware-next")).toBe("1");
    const get = new NextRequest("http://demo.local/api/admin/state", {
      headers: { host: "demo.local", authorization: basic("marta", "s3cret"), origin: "https://evil.example" },
    });
    expect(proxy(get).headers.get("x-middleware-next")).toBe("1");
  });

  it("also applies when no password is set (CSRF does not depend on the password)", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(proxy(post({ origin: "https://evil.example" })).status).toBe(403);
  });
});
