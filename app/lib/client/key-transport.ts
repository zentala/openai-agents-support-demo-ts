/** Enforce the visitor key's transport boundary before chat or consultant code can construct a request. */
export function safeKeyOrigin(address: string): boolean {
  const url = new URL(address);
  const loopback = url.hostname === "localhost" || url.hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(url.hostname);
  return url.protocol === "https:" || (url.protocol === "http:" && loopback);
}

export class InsecureKeyTransport extends Error {
  constructor() {
    super("OpenAI keys require HTTPS on non-loopback hosts. Open the HTTPS demo URL before sending your key.");
    this.name = "InsecureKeyTransport";
  }
}

/** SECURITY: throw before fetch; the exception never contains the key or request headers. */
export function visitorKeyHeaders(key: string, publicDemo: boolean, address: string): Record<string, string> {
  if (!publicDemo || !key.trim()) return {};
  if (!safeKeyOrigin(address)) throw new InsecureKeyTransport();
  return { "x-openai-key": key.trim() };
}
