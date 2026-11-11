# H09 implementation report — visitor keys, hosting templates, publication preparation

Date: 2026-11-11. Scope: [handoff](H09-public-demo-byok-and-publication-prep.md).
Importance: High. Points: H09a 8, H09b 3, H09c 3; total 14.
Implementer write access was verified for this repository. No push, repository creation,
external deployment or API-key file was performed. Exactly one live model turn was used.

## Delivered changes

| Item | Done / not done | Result |
| --- | --- | --- |
| H09a: visitor-funded public mode | Done | Request-local main/classifier/embedding clients, tab-memory key UI, header transport, redaction, disabled public tracing, abuse limits and reset protection |
| H09b: deployment preparation | Done | Node 22 multi-stage non-root standalone Dockerfile, secret-excluding context, free Render Blueprint and README instructions |
| H09c: publication cleanup | Done | Tracked source/docs/history notes anonymized, optional secret-manager script explicitly configured, GitHub description in STATE |
| Report | Done | This durable report, linked from STATE and the hosting backlog |
| Docker image execution | Not done: NOT_CHECKED | Docker executable is unavailable on this machine |
| Public deployment / HTTPS-host acceptance | Not done: outside implementer scope | Publication owner must publish and deploy; no public URL exists from this handoff |

### H09a

`PUBLIC_DEMO=true` ignores the owner's environment key for all model requests, including
nested classifier runs and KB embeddings. AsyncLocalStorage carries a request-only secret
scope outside serializable agent context. Each invocation creates its own provider/client,
pinned to the official API endpoint without owner organization/project overrides.
No environment mutation, shared credential-bearing clients or saved keys are used.

The native password control stores its value only in React tab memory. Clear and reload
erase it. Chat and consultant action POSTs use x-openai-key; SSE does not. A consultant
resuming an approval supplies that action's key and pays for resumed inference. A missing
key refuses before consuming the approval. Public runners, including classifiers, disable
SDK tracing. The Open trace link stays disabled in public mode.

Secrets are redacted at events/log, transcript, ticket, paused state, successful model
history and error boundaries. A provider 401 becomes 'OpenAI rejected the key: 401'.
Missing keys produce VisitorKeyRequired with 'Add your OpenAI key' in chat and Agent View.
Explicit error names survive production minification. Rule-based starters need no key.

Public 60-second limits: chat 30/IP and 10/thread; uploads 10/IP and 5/thread; thread
creation 20/IP. Buckets expire and cap at 10,000. HTTP 429 includes Retry-After. A trusted
proxy must replace forwarded headers. Public reset is hidden/refused unless explicitly enabled.
[ADR 011](../ADR/011-hosting-and-public-demo.md), ARCH, VISION, DESIGN and README describe
these choices. ADR 012 already belongs to developer annotations and was not repurposed.

### H09b

Docker builds a standalone Next.js artifact with Node 22 and runs it as the node user.
PORT is configurable. The runtime includes static assets and README; KB articles were
observed inside the generated standalone artifact. The build context excludes environment
files, dependencies, local cache, private tooling folders and planning/research artifacts.

The Render Blueprint selects free/single-instance Docker hosting, PUBLIC_DEMO=true,
generated SESSION_SECRET, prompted ADMIN_PASSWORD and disabled reset. README has the deploy
button, environment table, state-loss warnings and provider pricing links. The button targets
the planned publication repository and becomes usable after publication. No account/host
resources were created. The hosting backlog retains actual public-URL acceptance as pending.

Provider facts checked on 2026-11-11: [Render free-service documentation](https://render.com/docs/free)
still describes free web services, idle sleep and usage limits; [Blueprint reference](https://render.com/docs/blueprint-spec)
documents the configuration fields. [Fly.io pricing](https://fly.io/docs/about/pricing/)
places new organizations on usage billing. README promises no fixed prices or unlimited free use.

### H09c

Removed personal host names, process-manager bindings, installation paths and private terminal,
machine and secret-manager references from tracked text, including this handoff's historical
instructions. Optional broker support in scripts/with-key.mjs now depends exclusively on
PASSWORD_BROKER_SCRIPT, without a personal default. A reverse-proxy CSRF test uses a reserved
example domain with matching Origin and forwarded host.

The requested case-insensitive scan found one accidental match inside a dependency integrity
string. YAML escaping removes the textual match while preserving the exact parsed integrity
value; the entire parsed lockfile was compared with its original and is identical. No dependency
version, package data or upstream integrity value changed. Final grep matches only the allowed
publication GitHub URLs. Old Git history still contains old text: publish the owner's requested
fresh-history snapshot, not this implementation branch's historical commits.

## Acceptance evidence

| Check | Exit / result | Done / not done | Evidence |
| --- | --- | --- | --- |
| Final just check | 0 | Done | Typecheck, lint, 42 test files / 352 tests, 23 CodeTour anchors |
| Final just build | 0 | Done | Production routes compiled; app/.next/BUILD_ID, app/.next/server/app/ and app/.next/standalone/server.js observed |
| Server restart | 0 | Done | Existing production demo restarted after final build; running state observed |
| Final configured-domain layout smoke | 0; 151 PASS | Done | research/H09-layout.log, existing real panels, 1440/1024/768/390 and deterministic consultant flows |
| Public-mode live smoke | 0; 19 PASS | Done | scripts/smoke-public-demo.mjs; exactly one model turn, isolated server with empty OPENAI_API_KEY |
| Final public-mode offline recheck | 0; 18 PASS | Done | Same production build, no model calls, readable production error type and new-thread wait |
| Regression revert proofs | Three expected exits 1 | Done | Header requirement, event redaction, limiter: each reverted fix produced an assertion failure; files restored in finally |
| Independent source and image review | PASS | Done | Two review rounds plus final script/anchor confirmation; details below |
| Docker build | NOT_CHECKED | Not done | No docker executable available |
| Render YAML parse | PASS | Done | Parsed service is free; provider-side validation/deployment not performed |
| Lockfile semantic comparison | PASS | Done | Parsed old/new lockfiles identical, including every integrity value |
| Publication text scan | PASS | Done | Only allowed GitHub publication URL lines remain |
| Full paid eval suite | NOT_RUN | Not done: explicit scope | Handoff authorizes one live turn; models, prompts and business rules unchanged |

The live smoke received a key through the configured optional secret manager and
scripts/with-key.mjs, without exposing it to the agent. The browser filled the password
field from its process environment. The test confirmed absence from localStorage,
sessionStorage, cookies, visible text and captured application logs, then cleared the key.
No trace, video, network dump or screenshot was recorded while the real key was in the field.
All committed screenshots were captured with an empty key field. The temporary server was
closed afterward. Local HTTP was used only on loopback; production HTTPS remains a deployment
requirement, not a verified external-host claim.

Screenshots: [1440](../../docs/screenshots/h09-public-1440.png),
[1024](../../docs/screenshots/h09-public-1024.png),
[768](../../docs/screenshots/h09-public-768.png),
[390](../../docs/screenshots/h09-public-390.png).
Earlier tracked screenshots overwritten by the existing layout script were restored.

## Independent review and correction history

Reviewer: separate read-only source/image reviewer, h09_source_review. Filesystem handshake
reported workspace-write with compatible repo access; reviewer performed no writes.

Round 1 inspected actual code and all four rendered production screenshots. Findings:

| Finding | Importance | Points | Done / not done | Correction |
| --- | --- | --- | --- | --- |
| Sanitized CSRF fixture mismatched Origin/forwarded host | Medium | 1 | Done | Both use the same reserved example domain |
| Minified constructor leaked unreadable error type into UI | Medium | 2 | Done | Prefer explicit error name; regression test simulates a minified constructor |
| HTTP comment incorrectly described loopback as insecure | Low | 1 | Done | Use non-loopback example host |
| Impact-log row separated from Markdown table | Low | 1 | Done | Join row to its owning table |

Round 2 re-read corrected sources and reopened all four refreshed actual-app screenshots.
Verdict PASS: no clipping/occlusion, horizontal overflow or unreachable key controls; Clear
and input share 40px height; copy and links wrap. Readable VisitorKeyRequired appears in both
chat and Agent View. Zero open source or visual findings. Final small script reset wait and
CodeTour anchor maintenance were also independently confirmed PASS.

## Preserved unsuccessful checks

- Initial sandbox operations could not spawn Git/test helpers or reach the local process
  manager (EPERM). Approved escalated executions succeeded; restrictions were not weakened.
- First write was stopped by the single-writer hook because a descriptive session label did
  not match this session's actual ID. The incorrect lease was released and correctly assigned
  before any write. No hook bypass was used.
- First full check failed four tests: redaction copied the context reference, and existing
  page tests expected the old unwrapped JSX shape. Context identity was preserved and tests
  now inspect the actual child's security props.
- Next check failed the CSRF fixture after anonymization. Corrected matching example hosts.
- Subsequent check passed tests but failed eight moved CodeTour anchors. Updated exact lines
  and the runner factory pattern; final anchor check passes. UTF-8 tour prose was preserved.
- Two offline browser attempts exited 1 while checking inspector output after resetting the
  thread. The script now waits for the created thread identity to be rendered and for the
  independent inspector feed; final offline run passed. No additional live model turn ran.
- The final staged diff check flagged trailing spaces in raw layout output; whitespace was
  normalized without changing check names or verdicts, and the staged diff check then passed.
- Docker build was never attempted because Docker is unavailable; this is NOT_CHECKED, not PASS.

## Delivery and remaining work

Each item is committed separately, followed by this report and final design-log entry.
Commit subjects: feat: add request-isolated visitor keys for public demo;
build: add free Render and standalone Docker deployment templates;
docs: remove private environment bindings for publication;
docs: record public demo acceptance and publication handoff. No pushes, public repository
creation or external deployment were performed. No API key was printed or written to a file.

Publication owner next: review the commits, publish the cleaned fresh-history snapshot,
deploy the Blueprint with private credentials, and verify its actual HTTPS public URL.
Docker image execution and first public CI run remain pending in the owning backlog.
