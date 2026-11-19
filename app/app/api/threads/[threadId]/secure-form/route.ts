/**
 * Secure form target: the bank account or phone number goes from the browser DIRECTLY to this route.
 * The model never sees the value (see lib/tools/secure-forms.ts for the tool that shows the form).
 *
 * Checks, in order: thread credential cookie -> customer is verified (not a guest) -> field and value
 * validated (IBAN checksum, phone format) -> stored in the vault -> only a status and the last four
 * characters come back.
 *
 * SECURITY: the value is never logged, never echoed in an error, never put in an event. The panel gets
 * a `sensitive_stored` event with the status text only.
 */
import { z } from "zod";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import { isValidIban } from "@/lib/sensitive/iban";
import { isValidPhone } from "@/lib/sensitive/phone";
import { storeSecret, type SecretField } from "@/lib/sensitive/vault";
import { authorizeThread } from "@/lib/security/thread-access";
import { GUEST_ID } from "@/lib/types";

const MAX_VALUE_LENGTH = 64;

const bodySchema = z.object({ field: z.enum(["iban", "phone"]), value: z.string().trim().min(1).max(MAX_VALUE_LENGTH) });

const VALIDATORS: Record<SecretField, { isValid: (value: string) => boolean; message: string }> = {
  iban: { isValid: isValidIban, message: "This is not a valid IBAN (the checksum or length is wrong). Please check the number." },
  phone: { isValid: isValidPhone, message: "This is not a valid phone number. Use 9-15 digits, with the country code if you can." },
};

const refuse = (status: number, errorType: string, message: string) => Response.json({ ok: false, errorType, message }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const access = authorizeThread(req, threadId);
  if (!access.ok) return access.response;
  // SECURITY: data stored for a guest could be attached to nobody; require a verified customer first.
  if (access.thread.customerId === GUEST_ID) {
    return refuse(403, "NotVerified", "Please verify your identity in the chat first (order number and e-mail).");
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return refuse(400, "InvalidRequest", "Body must be { field: 'iban' | 'phone', value }");
  const { field, value } = parsed.data;
  const validator = VALIDATORS[field];
  // The message names the rule, never the value.
  if (!validator.isValid(value)) return refuse(422, "InvalidValue", validator.message);

  const stored = storeSecret(threadId, field, value);
  if (!stored.ok) return refuse(429, stored.errorType, stored.message);
  emitAgentEvent(threadId, { kind: "sensitive_stored", field, status: stored.status });
  return Response.json({ ok: true, status: stored.status });
}
