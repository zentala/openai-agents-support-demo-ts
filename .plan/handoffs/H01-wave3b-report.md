# H01 delivery report — wave 3b fixes

Date: 2026-11-09. Repository: agent-demo, branch: main. No push performed.

Source implementation is complete. Overall acceptance remains **FAILED**:
the real-model eval and browser smoke encountered OpenAI billing error 429,
"You have no credits remaining." No alternate key/provider or billing changes were attempted.

## Scope and commits

| Task | Importance | Points | Done / not done | Commit | Result |
|---|---|---|---|---|---|
| D3 — guest verification | Medium | 3 | Source done; real-model acceptance failed | `5e9486f` | Required e-mail; postal code only an extra factor; three attempts per thread and five per normalized order per hour across threads; generic failure responses. Tool schema, prompts, guest scenarios and tests updated. |
| D4 — public session secret | Low | 1 | Source done | `b3aa95d` | One server warning outside development/tests, also for an explicitly configured public default. Agent View notice receives only a boolean; runtime page rendering avoids freezing build-time configuration. |
| D5 — Iceland eval | Low | 1 | Source done; real-model acceptance failed | `76ec1ed` | Only uncertainty directly governing the delivery clause exempts it; unrelated earlier hedges cannot excuse a later affirmative claim. Both Iceland scenarios updated. |
| D6 — address proposal identity | Low | 2 | Source done; real-browser flow not reached | `8af02f5` | Fresh proposal UUID carried by card, click and eval runner; API requires it. Old Confirm and Cancel refuse visibly without consuming the new proposal. |
| D7 — memory caps | Low | 1 | Source done | `a14daa1` | 100 oldest-created threads retained; 50 photos; 100 vault entries. Full photo/vault storage refuses new entries; existing secrets remain available. Photo insertion rechecks capacity synchronously after asynchronous body reads. |
| R — Security section | High | 2 | Done | `684b0ad` | Development hardening, remaining demo limits, masking scope and operational boundaries. Remaining secure-form and evicted-thread guidance aligned with the code. |

Total: 10 points from the task table (the handoff's introductory estimate was about 8).
The initial uncommitted verification changes and new limiter were inspected before editing.
The limiter's per-key array was also bounded: denied requests no longer append timestamps.
`.tours/` was not edited. Existing D1/D2 changes were preserved.

## Acceptance evidence

| Check | Exit | Done / not done | Evidence |
|---|---|---|---|
| `just check` | 0 | Done | Typecheck, lint and 27 Vitest files / 275 tests passed on final relevant source. |
| `just build` | 0 | Done | Next.js 16.4.5 production build compiled, TypeScript passed, seven static pages generated; `/` is dynamic. |
| D3 revert | 1 expected | Done | Replacing verification.ts with its pre-fix version failed four of 15 tests: postal-only pure/tool access and known/unknown cross-thread order lock. Restored source: exit 0, 15/15. |
| D5 revert | 1 expected | Done | Restoring the old scenario regex failed four affirmative-claim examples with earlier hedges. Restored source: exit 0, 32/32 scenario tests. |
| D6 revert | 1 expected | Done | Removing the nonce comparison while preserving generated proposal IDs failed two stale-card behavior tests: old Confirm applied the new address; old Cancel discarded it. Restored source: exit 0, 15/15 address tests. |
| D4 targeted tests | 0 | Done | Six tests: production/staging/unset modes warn; development/test stay quiet; explicitly configured public default and private-value notice flags. |
| D7 targeted tests | 0 | Done | 37 tests across storage caps, claims and sensitive data. Includes two uploads racing for the final photo slot: one 200, one 429. |
| `just eval guest-verify-success guest-no-data-before-verify guest-verify-lockout kb-unknown` | 1 | Failed | 0/4 passed, all stopped by OpenAI credit exhaustion during input guardrails. Details below. |
| `restart the server` | 0 | Done | your process manager returned running; subsequent status confirmed ready/live, production service on port 4336 from this repo's app directory. |
| Browser smoke after restart | 1 | Failed | Two printed checks passed, four failed. OpenAI credit exhaustion prevented guardrail completion; the script timed out after 120 seconds waiting for its verdict. |

Build artifacts observed after successful completion:

- `agent-demo/app/.next/BUILD_ID`
- `agent-demo/app/.next/server/app/page.js`
- `agent-demo/app/.next/server/app/` (compiled pages and API routes)

The production service loads `agent-demo/app/.next` through its existing process-manager-managed
`next start` command. No second server was launched.

## Real-model eval results

Command: `just eval guest-verify-success guest-no-data-before-verify guest-verify-lockout kb-unknown`.
The runner executes selected scenarios in JSON order, not argument order.
The existing wrapper injected the key into the child process without printing or storing it.

| Scenario | Result | Duration | Done / not done | Reason |
|---|---|---|---|---|
| `kb-unknown` | FAIL | 21,078 ms | Failed | Input guardrail could not complete; no search_kb call. |
| `guest-verify-success` | FAIL | 36,489 ms | Failed | Input guardrail could not complete; no verification or order tool call. |
| `guest-no-data-before-verify` | FAIL | 18,925 ms | Failed | Input guardrail could not complete. Lack of order disclosure alone is insufficient to pass a crashed run. |
| `guest-verify-lockout` | FAIL | 73,452 ms | Failed | Input guardrail could not complete; no VERIFICATION_FAILED tool result. |

All four returned the same observed cause:

```text
GuardrailExecutionError: Input guardrail failed to complete:
Error: 429 You have no credits remaining.
Add credits to continue using the API at
https://platform.openai.com/settings/organization/billing/.
```

This is an API billing prerequisite, not evidence that the model-driven behavior passed.

## Browser smoke

Executed after successful build and server restart:

```powershell
$env:PROXY_PAC='<your proxy PAC, if any>'
node scripts/smoke-v1.mjs http://127.0.0.1:3100/
```

The unchanged script uses headless Playwright Chromium and a 1500 × 1000 viewport.
The rendered production page was inspected in
`agent-demo/research/v1-a-normal-question.png`: both panels and input render;
the customer bubble displays the specific OpenAI 429 error. The public-secret
notice is absent with your process manager's configured secret. A positive live screenshot of
that notice was not checked; its configuration behavior is covered by unit tests.
This was a small notice using the existing inspector-notice styling, recorded in DESIGN.md.

All printed checks:

| Check | Result | Done / not done | Evidence |
|---|---|---|---|
| a: assistant answered | PASS (weak assertion) | Done | A nonempty error bubble exists; this does not establish a successful agent answer. |
| a: handoff + tool_call + tool_output + normalization + context_update in panel | FAIL | Failed | Only `normalization,error` appeared. |
| a: an agent card is active | FAIL | Failed | No successful agent activation. |
| Flow did not crash | FAIL | Failed | 120,000 ms timeout waiting for `[data-testid="guardrail-jailbreak_guardrail"][data-status="failed"]`; the actual card was GuardrailExecutionError / OpenAI 429. |
| No error cards in the panel | FAIL | Failed | The panel correctly showed the provider credit error. |
| No console errors | PASS | Done | `[]`; no browser console/page errors. |

Checks not reached after that timeout are **NOT_CHECKED**, not passed:

- Injection verdict/reasoning/specific refusal (flow b).
- Pending approval, read-only customer card, consultant decision/audit and resumed refund (c/h).
- German answer and English knowledge-base hit (d).
- Order-picker buttons, accessibility group and structured-click context updates (e).
- Escalation ticket, takeover, consultant reply, hand-back, ratings/export and console error banner (f/g/i).
- Unauthorized customer-stream refusal, damage-claim slots/photo upload, secure IBAN form/refund,
  guest verification and address-confirmation browser flows (wave 3b).

Raw local output: `agent-demo/research/H01-smoke.log`.
Screenshots: `agent-demo/research/v1-a-normal-question.png` and
`agent-demo/research/v1-failure.png`. No successful documentation screenshots were overwritten.

## Files changed

Implementation commits changed the following files; the report and final journal entry
are additional delivery documentation.

- Documentation: `DESIGN.md`, `README.md`, `.plan/JOURNAL.md`.
- HTTP routes: `app/app/api/chat/route.ts`,
  `app/app/api/threads/[threadId]/photo/route.ts`,
  `app/app/api/threads/[threadId]/secure-form/route.ts`.
- Page/UI: `app/app/page.tsx`, `app/components/support-demo.tsx`,
  `app/components/agent-panel.tsx`, `app/components/session-secret-notice.tsx`,
  `app/components/address-confirm.tsx`.
- Guest flow: `app/lib/guest/verification.ts`, `app/lib/guest/order-attempts.ts`,
  `app/lib/tools/verify-customer.ts`, `app/lib/tools/helpers.ts`,
  `app/lib/agents/prompts.ts`, `app/lib/runtime/secure-form-notice.ts`.
- State/security: `app/lib/address/address-flow.ts`, `app/lib/runtime/threads.ts`,
  `app/lib/data/store.ts`, `app/lib/sensitive/vault.ts`,
  `app/lib/security/thread-credential.ts`, `app/lib/security/thread-access.ts`,
  `app/lib/types.ts`.
- Eval data/runner: `app/data/scenarios.json`, `app/scripts/eval.ts`.
- Tests: `app/tests/guest-verification.test.ts`, `app/tests/session-secret.test.ts`,
  `app/tests/scenarios.test.ts`, `app/tests/address-change.test.ts`,
  `app/tests/storage-caps.test.ts`, `app/tests/claims.test.ts`.

## Earlier failures and disposition

- Initial guest test command exited 1 before tests: Vite's configuration loader
  encountered `spawn EPERM` inside the filesystem sandbox. The required approved
  escalation ran the same tests successfully.
- Main-checkout writes were stopped by the named single-writer lease hook when
  the 90-second lease expired. Its printed acquire command succeeded; writing
  resumed only after acquisition.
- One revert-check shell command was refused before execution because its write
  destination used unresolved shell expansion. The hook explicitly requested a
  direct path; the corrected command used the literal repo path and was accepted.
- Initial D7 typecheck exited 2 because an existing test fixture assumed photo
  insertion could never refuse. It now handles the capacity result. Subsequent
  typecheck and full `just check` passed.
- your process manager access inside the sandbox returned named-pipe `connect EPERM`. Approved
  escalation provided status/restart access. The daemon was not replaced.
- The first login-shell read emitted permission errors attempting to lock the
  user-level `.gitconfig`; subsequent commands used a non-login shell. Repository
  reads and the requested commits succeeded.

## Outstanding work

The account owner must restore OpenAI API credits before real-model acceptance
can pass. Then rerun the same four-scenario eval and complete smoke against
http://127.0.0.1:3100/; retain the failed run above in the history.
No source implementation remains outstanding in this handoff. No push is authorized.
