# 006 — Sensitive data through secure forms, never through the model

## TLDR

Bank accounts and phone numbers are entered in a secure form that posts to a server route.
The model sees only a status. Card, IBAN and phone numbers typed into the chat are masked
before the model sees them, and again in output.

- **Status:** accepted
- **Date:** 2026-11-09

## Context

A refund needs a payout account. The model is a third party: whatever enters the prompt goes
to the provider and into traces. A customer may also paste a card number into the chat.

## Options considered

1. **Let the model collect the IBAN in chat.** Easy, but the data enters prompts and traces.
2. **Secure form outside the model**, validation and storage in code, status text for the model.
3. **Payment provider token.** The production answer; out of scope here.

## Decision

Option 2, plus masking.

- Tools `request_bank_account` and `request_callback_phone` show a form widget. The form posts
  to `/api/threads/[threadId]/secure-form` (thread cookie required), which validates the IBAN
  checksum or phone format and stores the value in a server-side vault.
- The model gets a status such as `IBAN_PROVIDED (last 4: 2874)`.
- `normalizeInput` masks Luhn-valid cards, supported IBAN shapes and phone-like digit runs before
  the model; code then points to the form. Invisible characters are stripped first.
- `leakGuardrail` blocks such data in answers.
- The vault is capped (100 entries, 6 submissions per thread).

## Consequences

- Masking is a heuristic. Names, e-mails and addresses can still reach the model. Odd formats
  and numbers written as words can evade it. Phone-like tracking numbers can be masked by mistake.
- Values sit unencrypted in memory; production needs a tokenizing provider.
- Never use the demo with real payment data.

## Evidence

- [app/lib/sensitive/](../../app/lib/sensitive/),
  [app/lib/tools/secure-forms.ts](../../app/lib/tools/secure-forms.ts),
  [app/lib/guardrails/normalize-input.ts](../../app/lib/guardrails/normalize-input.ts),
  [leak-detect.ts](../../app/lib/guardrails/leak-detect.ts).
- [JOURNAL.md](../JOURNAL.md): "H02 task 3" (zero-width bypass), "R".
- README "Demo limits".
