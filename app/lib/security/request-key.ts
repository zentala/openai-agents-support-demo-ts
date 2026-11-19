/** Request-local secret scope. AsyncLocalStorage isolates visitors without serializing keys. */
import { AsyncLocalStorage } from "node:async_hooks";

const scope = new AsyncLocalStorage<{ key?: string }>();
export const isPublicDemo = () => process.env.PUBLIC_DEMO === "true";

/** SECURITY: never copy this scope into agent context, RunState, events or logs. */
export function withRequestKey<T>(request: Request, work: () => T): T {
  return scope.run({ key: request.headers.get("x-openai-key")?.trim() }, work);
}

export class VisitorKeyRequired extends Error {
  constructor() {
    super("Add your OpenAI key");
    this.name = "VisitorKeyRequired";
  }
}

/** Called immediately before model work; rule-based starters remain free. */
export function requestApiKey(): string | undefined {
  if (!isPublicDemo()) return undefined;
  const key = scope.getStore()?.key;
  if (!key || key.length > 512 || !/^sk-[A-Za-z0-9_-]+$/.test(key)) throw new VisitorKeyRequired();
  return key;
}

/** Redact the exact request secret and recognizable keys, including provider-error fragments. */
export function redactSecrets(text: string): string {
  const key = scope.getStore()?.key;
  const safe = key ? text.replaceAll(key, "[key removed]") : text;
  return safe.replace(/\bsk-(?:(?:proj|svcacct|admin)-)?[A-Za-z0-9_-]{20,}\b/g, "sk-***");
}

/** Sanitize JSON-shaped values before persistence or publication. */
export function redactValue<T>(value: T): T {
  if (typeof value === "string") return redactSecrets(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactValue(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [redactSecrets(key), redactValue(item)])) as T;
  }
  return value;
}
