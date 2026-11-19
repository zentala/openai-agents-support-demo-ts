/** Build a shareable diagnostics snapshot; sensitive strings are masked and credential fields are omitted. */
import { maskSensitiveText } from "@/lib/guardrails/normalize-input";
import { redactSecrets } from "@/lib/security/request-key";

const PRIVATE_FIELD = /^(?:api[-_]?key|session[-_]?secret|cookie|cookies|authorization|vault|vaultValues)$/i;
const KEY_TEXT = /\bsk-(?:(?:proj|svcacct|admin)-)?[A-Za-z0-9_-]{4,}\b/gi;

/** Recursively strip credential fields and mask secrets that could occur in prose or event values. */
export function sanitizeDiagnostics<T>(value: T): T {
  if (typeof value === "string") return maskSensitiveText(redactSecrets(value.replace(KEY_TEXT, "[key removed]"))).text as T;
  if (Array.isArray(value)) return value.map(sanitizeDiagnostics) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !PRIVATE_FIELD.test(key))
      .map(([key, item]) => [sanitizeDiagnostics(key), sanitizeDiagnostics(item)])) as T;
  }
  return value;
}
