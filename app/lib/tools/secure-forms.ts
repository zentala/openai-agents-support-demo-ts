/**
 * Agents SDK: tools that show a SECURE FORM in the chat (`request_bank_account`, `request_callback_phone`).
 *
 * Concept: sensitive values must never pass through the model. These tools do not ask for the value; they
 * publish a *widget* event, the browser draws a form, and the form posts DIRECTLY to our server
 * (app/api/threads/[threadId]/secure-form/route.ts), which validates and stores the value in the vault.
 * What the model gets back is a status string such as "IBAN_PROVIDED (last 4: 1234)".
 *
 * INTERVIEW: "The model is a third party. For an IBAN I give it a button, not a text box: it learns THAT the
 * customer provided the account, never WHICH account."
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import { getSecret, secretStatus, type SecretField } from "@/lib/sensitive/vault";
import type { SecureFormWidget, SupportContext } from "@/lib/types";
import { asData, requireVerified, sessionOf } from "./helpers";
import { toolErrorHandler } from "./tool-error";

export const SECURE_FORMS: Record<SecretField, Pick<SecureFormWidget, "title" | "hint">> = {
  iban: { title: "Bank account for your refund", hint: "IBAN: your country code (PL for Poland) and the digits. It goes straight to our server, not to the assistant." },
  phone: { title: "Phone number for the callback", hint: "With country code, e.g. +48 600 100 200. It goes straight to our server, not to the assistant." },
};

function makeFormTool(field: SecretField, name: string, description: string) {
  return tool<z.ZodObject<Record<string, never>>, SupportContext>({
    name,
    description,
    parameters: z.object({}),
    errorFunction: toolErrorHandler(name),
    execute: async (_input, runContext) => {
      const session = sessionOf(runContext);
      const notVerified = requireVerified(session);
      if (notVerified) return notVerified;
      if (getSecret(session.threadId, field) !== undefined) {
        return asData(name, { status: secretStatus(session.threadId, field), instruction: "Already on file. Do not show the form again; continue with the customer's request." });
      }
      emitAgentEvent(session.threadId, { kind: "widget", widget: { type: "secure-form", field, ...SECURE_FORMS[field] } });
      return asData(name, {
        status: "FORM_SHOWN",
        instruction:
          "The customer sees a secure form now. Write ONE short sentence asking them to fill it in. " +
          "NEVER ask for the number in the chat and never repeat any number the customer wrote.",
      });
    },
  });
}

export const requestBankAccount = makeFormTool(
  "iban",
  "request_bank_account",
  "Show the customer a secure form for their bank account (IBAN). Use it when a refund of a cash-on-delivery " +
    "order needs a payout account, or the tool says BANK_ACCOUNT_REQUIRED. Never ask for the IBAN in the chat.",
);

export const requestCallbackPhone = makeFormTool(
  "phone",
  "request_callback_phone",
  "Show the customer a secure form for a callback phone number. Use it when the customer wants to be called. " +
    "Never ask for the number in the chat.",
);
