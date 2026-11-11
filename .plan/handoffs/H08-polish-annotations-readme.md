# H08 — H07 review fixes, developer annotations, README with screencast

## TLDR

H07 passed the independent visual review (Claude Fable): the active tab no longer
shifts and the app reads as an evolution of the original OpenAI demo. This handoff
closes the 7 small findings (N1–N7), the eval-runner crash, adds a developer
annotation toggle and rewrites the README with a short animated screencast.
Points: H08a {ok. 8p}, H08b {ok. 3p}, H08c {ok. 5p}. Effort: medium.

## H08a {8p} — review fixes and eval runner

From the H07 independent visual review:

| # | Pts | Fix |
|---|---|---|
| N1 | 1 | 1024px: customer selector truncates ("Anna Kowalska (pl"): min width ≈190px or hide the brand below 1280px. Add 1024px screenshots to the smoke. |
| N2 | 1 | 768px: selector is a full-width dark block on its own row; limit width from `md`, not `lg` (DESIGN.md: own row only 390–767). |
| N3 | 1 | "Correction (optional)" field: 14px text, shorter placeholder or wider field. |
| N4 | 1 | Consultant "Ticket … open — the agent keeps answering…" note: `rounded-md` note (not a pill) or short "ticket open" badge; no ugly wrap at 390px. |
| N5 | 1 | History date: ISO `2026-11-10 08:23:58`, not locale `10/11/2026`. |
| N6 | 1 | DESIGN.md Tabs row: count badge is grey `bg-gray-100 text-zinc-700` (code is right). |
| N7 | 1 | Retry in the red notice uses the standard secondary button recipe; hide "Unprotected demo" label while a 401 error is shown. |
| E1 | 1 | `app/scripts/eval.ts` `clickAddressCard` throws "no address change proposal is pending" when the model did not propose: record a FAIL for that scenario and continue. Test. Close `.plan/backlog/eval-runner-crash-on-missing-proposal.md`. |

## H08b {3p} — developer annotation toggle

Owner's request: an annotation/feedback overlay so the developer can leave visual
feedback on the page; **off by default**, enabled only by a special flag, plus a
switch in a settings area. Use the Agentation toolbar (read
`the optional annotations setup guide` first; package `agentation`).
- Enable condition: env `NEXT_PUBLIC_DEV_ANNOTATIONS=true` (build-time) OR URL param
  `?annotate=1` stored in `localStorage`; never enabled in a default public build.
- A small "Settings" control (gear icon in the Agent View header area, consistent with
  DESIGN.md) holding an "Annotations" switch, visible only when the flag allows it.
- Lazy-load the toolbar so it costs nothing when off. Document in README and
  DESIGN.md (decision row). Close `.plan/backlog/dev-annotations-toggle.md`.
- Test: off by default (no toolbar in DOM), on with the flag; smoke check both.

## H08c {5p} — README and screencast

- Rewrite `README.md` for publication (English): one-line pitch; "Inspired by
  openai/openai-cs-agents-demo" with what is the same and what this adds (TypeScript
  end to end, human approvals + consultant console, code-enforced rules, secure forms,
  guest mode, evals and browser smoke, security section); hero animation at the top;
  feature tour with screenshots (h07-*); quick start (OPENAI_API_KEY or `.env.local`),
  `just` commands; architecture (link `.plan/ARCH.md`, `.plan/ADR/`, `AGENTS.md`);
  models section (ADR-002: gpt-4.1 agents, gpt-6-luna guardrails, eval-driven);
  security section (keep); hosting status (ADR-011 proposed); license/NOTICE.
- Screencast: extend the Playwright smoke with `recordVideo` for one short, scripted
  flow that shows the key moments on a timeline (e.g. starter "Asks for a human" →
  amber trace row → Consultant tab badge → open ticket → take over → reply → customer
  sees it; or a refund above limit → approval → resumed answer). Keep it ≤ 20 s,
  convert with ffmpeg (available on PATH) to an optimized GIF (≤ 3 MB) and WebM in
  `docs/media/`, and add `just screencast` to regenerate it on demand. Use rule-based
  flows where possible (they cost nothing); at most a few model turns.
- Close `.plan/backlog/readme-and-screencast.md`.

## Constraints and acceptance

Same rules as H07 (`.plan/handoffs/H07-design-review-implementation.md`): DESIGN.md
first, lease hook, `corepack pnpm`, `CI=true`, commit per item, no AI attribution,
no push, keep `just check` (incl. the CodeTour checker) green, no full `just eval`
(run only the address scenarios once after E1). Per part: `just check`, `just build`,
`restart the server`, layout smoke via PROXY_PAC. Screenshots
`docs/screenshots/h08-*.png` for N1/N2/N4/N7 and the settings switch (off/on).
Report: `.plan/handoffs/H08-polish-annotations-readme-report.md`.
