# H10 — pre-publication fixes report

Date: 2026-11-11. Scope: [accepted handoff](H10-pre-publication-fixes.md).
Importance: High. Accepted estimate: 13 points. All nine requested items have separate commits;
the repository lease was released immediately after each. No push, repository creation or
full model eval was performed. Final verification and review passed. Exactly one live model turn was used; all other
public smoke runs were offline. Final results are recorded below.

## Delivered items

| Item | Points | Done / not done | Result |
| --- | --- | --- | --- |
| M1 | 1 | Done | Word-boundary credential regex with optional recognized prefixes and a 20-character body; ordinary furniture/support words preserved |
| M2 | 2 | Done | TRUSTED_PROXY_HOPS selects from the trusted right end; zero ignores headers; expired then oldest buckets are evicted |
| M3 | 3 | Done | Classifier/approval refusal, retained pending decisions, ticket/RunState redaction, non-empty real Console output and browser cookie/storage/URL tests |
| M4 | 1 | Done | Research owner-name references anonymized; safe publication scanner includes owner-name variants without printing credential matches |
| M5 | 5 | Done | Cookie-scoped console state, transcripts, inspector, actions, approvals, audit, ratings/export and metric inputs; optional public administrator password |
| L1 | 1 | Done | HTTPS warning and shared browser guard prevent insecure non-loopback key requests; mobile correction preserves usable message space |
| L2 | — | Done | README starts with the requested unofficial/no-affiliation sentence |
| L3 | — | Done | Private proxy PAC references replaced with generic guidance; scan checks for their recurrence |
| L4 | — | Done | Original lockfile notation restored; lockfiles excluded from text scan; frozen installation passed |

### Security behavior

Public console access reuses the existing signed nh_thread_* cookies. No new identity store
or visitor-supplied customer ID is trusted. Two browsers choosing the same mock customer still
have different capabilities. Every public collection and metric input is filtered before
serialization. Transcript/inspector reads and all mutation targets are authorized before
reading, replaying or changing records. Approval IDs resolve to their owning thread first.
Foreign and unknown targets receive the same 403. Export/state responses are no-store.

ADMIN_PASSWORD is optional in public mode. If configured, it adds Basic authentication but
never grants access to another visitor's conversation. Local mode retains its staff-wide
view and existing Basic/CSRF behavior. Public global reset additionally requires an operator
password even when ALLOW_DEMO_RESET=true, preventing a visitor from clearing others' records.

A private SESSION_SECRET is enforced in public mode: missing/published-default secrets cause
thread creation to return 503 before issuing a cookie; credential verification refuses and
signing throws. Render generates this secret without prompting for an administrator password.
README, [ADR 011](../ADR/011-hosting-and-public-demo.md), the
[thread-channel ADR](../ADR/005-thread-credential-and-event-channels.md) and
[ARCH](../ARCH.md) describe the boundary. Shared synthetic shop fixtures remain demo data;
this change isolates conversation records and console operations.

The shared key-header callback protects both chat and consultant action requests. It permits
HTTPS and explicit loopback HTTP only. An insecure remote origin throws InsecureKeyTransport
before fetch. Missing-key deterministic requests remain usable. The key form warns on HTTP;
public stacked chat reserves sufficient height rather than clipping replies below the warning.

The publication scan reads tracked UTF-8 text and checks private topology, owner-name variants,
private PAC bindings and long credential shapes. It never prints matched credential content.
Only the planned publication repository URL and LICENSE author identity are exempt. Upstream
lockfiles are excluded rather than modified to satisfy textual matching.

## Acceptance

| Check | Exit / result | Done / not done | Evidence |
| --- | --- | --- | --- |
| corepack pnpm --dir app install --frozen-lockfile | 0 | Done | Already up to date; frozen lock accepted |
| Final just check | 0 | Done | Typecheck, lint, 47 test files / 385 tests and 23 CodeTour anchors |
| Final just build | 0 | Done | Production routes and standalone artifact observed; compiled routes include SessionSecretRequired |
| Local server restart | 0 | Done | Final build loaded by the existing production service; follow-up status running |
| Layout smoke | 0; 151 PASS | Done | Existing reverse-proxy demo domain (anonymized here); no model calls or console errors |
| Public-demo smoke | 0; 36 PASS | Done | Two visitor contexts, storage/cookies/URLs, HTTPS guard and exactly one live model turn |
| Final offline public smoke | 0; 34 PASS | Done | Same corrected source, includes 390×844 message space and HTTP fixture without model access |
| Independent source review | PASS | Done | Separate read-only reviewer inspected the actual changes |
| Corrected visual review | PASS | Done | All five actual-app images inspected independently, including 390×844; no open findings |
| Publication scan | 0; 0 findings | Done | Final staged tree including this report; exact safe output below |
| Full eval | NOT_RUN | Done: limit respected | Explicitly excluded by the handoff |

Build artifacts: app/.next/BUILD_ID, app/.next/server/app/ and
app/.next/standalone/server.js. The final compiled routes must include SessionSecretRequired;
an earlier intermediate build preceded that correction and was not used as final proof.
Final just check/build were observed after the mobile correction; no product source changed afterward.

Final publication scan output:

```text
PASS publication scan: 323 tracked text files, 1 lockfile(s) excluded, 0 findings
```

Public smoke uses a temporary loopback server with an empty server OPENAI_API_KEY and a
fresh private cookie-signing secret. The two-context isolation flows use deterministic human
requests, so they consume no model turn. A routed non-loopback HTTP fixture loads the real
built app and intercepts model endpoints, ensuring a failed transport guard cannot spend
credits. That fixture is labeled separately from actual reverse-proxy runtime evidence.
No traces, video, request-header dumps or screenshots are captured with a real key in the form.

Screenshots: [1440](../../docs/screenshots/h10-public-1440.png),
[1024](../../docs/screenshots/h10-public-1024.png),
[768](../../docs/screenshots/h10-public-768.png),
[390×1000](../../docs/screenshots/h10-public-390.png),
[390×844](../../docs/screenshots/h10-public-390x844.png).
Old tracked screenshots overwritten during acceptance are restored before delivery.

## Independent review and corrections

Reviewer: h09_source_review, separate read-only source/image reviewer with a compatible
filesystem handshake and no writes or model calls. Review history is retained here.

| Finding | Importance | Points | Done / not done | Correction and evidence |
| --- | --- | --- | --- | --- |
| Public default secret permits forged visitor cookies | High | 3 | Done | Fail closed in creation, verification and signing; tests both missing/default values; independently re-reviewed PASS |
| Inspector module header still described staff-wide access | Low | 1 | Done | Header now distinguishes cookie-scoped public mode from local staff mode; source re-review PASS |
| HTTP notice compresses mobile messages | Medium | 3 | Done | Public panel minimum 44rem; at least 160px message viewport checked at 768×1000,390×1000,390×844; independent image re-review PASS |

Initial source review found no further bypass in data filtering, action target checks,
inspector replay or optional Basic authentication. Subsequent review accepted the HTTPS guard,
publication changes and correction source. Final image re-review reopened all five corrected captures: the complete missing-key answer
and reachable composer are visible at 390×844, with no clipping/overlap at the reviewed widths.
All source and visual findings are closed. The reviewer made no writes or model calls.

## Unsuccessful attempts retained

- The first logging test observed process stdout while the test runner intercepted global
  console output, so its non-empty assertion failed. It now uses Node's actual Console with a
  writable sink; it asserts non-empty output, a real formatted message and absence of the key.
- Initial visitor tests passed behavior but typecheck exited 2 because an inferred context
  made language mandatory. An explicit SupportContext annotation fixed the invariant generic.
- The first final HTTP-origin fixture completed all assertions but process exit was 1: it
  attempted to buffer an infinite SSE response and teardown raised Request context disposed.
  The transport-only fixture now supplies a finite SSE response and awaits unrouteAll before
  closing. The subsequent offline run exited 0. No model turn was used in these attempts.
- An unprivileged process inspection returned Access denied. The approved inspection found
  no remaining test server for that failed attempt. No unrelated process was stopped.
- The first public mobile screenshots exposed clipped replies despite width-only assertions.
  The panel height was corrected and smoke now checks actual message space at a short viewport.
- Earlier successful builds/checks remain intermediate evidence; final results above apply
  to the corrected source. No failed result was treated as an unknown or successful run.

## Commits and lease lifecycle

One commit per requested item:

1. fix: limit secret redaction to real key shapes
2. fix: trust forwarded IP hops and evict oldest rate buckets
3. test: cover public key storage and approval boundaries
4. docs: anonymize research and scan publication text
5. fix: scope public console access to visitor conversation cookies
6. fix: block visitor keys on insecure remote HTTP origins
7. docs: lead README with OpenAI affiliation disclaimer
8. docs: replace private proxy PAC bindings with generic guidance
9. chore: restore upstream lockfile and exclude lockfiles from publication scan

Each commit was followed by a successful lease release. A separate correction commit records
mobile acceptance and test-fixture cleanup; the final report/evidence commit also releases
its lease. The final working tree is clean. No force-push, remote publication or repository creation occurred.

## Remaining publication work

The owning publication workflow must create/publish the cleaned fresh-history snapshot,
run its first hosted CI and deploy/verify an actual HTTPS public URL. This implementation
performs none of those external actions. Old private references remain in historical commits;
use the accepted fresh-history publication plan rather than exporting this branch's history.

## H10 follow-up addendum — 2026-11-11

The independent-verification follow-up is complete, with one commit per item:

- F2: added a public-mode own-thread `decide_approval` test that expects HTTP 200 and
  `{ ok: true }`, verifies the own pending approval is removed, preserves the foreign
  approval, and checks the new audit entry, stored reply and resumed inference call.
- F1: added "Known limitations of the public demo" to ADR 011 and one sentence under
  README Security / Demo limits explaining that orders and refund totals per order are
  shared synthetic state, so visitors can affect the same demo customer's shop view.
- F3: added the second limitation to ADR 011 and one README sentence stating that public
  visitors approve their own refunds and supply the audit's consultant name from the
  client, so the audit has no evidentiary value.

Validation: `just check` exited 0 — 47 test files, **386 passed, 0 failed, 0 skipped**;
all 23 CodeTour anchors passed. The focused visitor-console run exited 0 with 9 tests
passed and 0 skipped. No model/provider calls were made; resumed inference is mocked.

Independent source review of the own-approval test: PASS. Cookie/key checks, RunState
restoration, decision consumption, audit and transcript storage remain real; only
`executeSupportRun` is replaced. This test establishes the public route's own-thread
approval behavior, not execution of a refund tool or emission of an SSE event.

The three item commits and this addendum each release their repository lease after
commit. No push was performed.
